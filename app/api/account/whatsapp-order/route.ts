import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getCustomerSession } from "@/lib/server/getCustomerSession";
import {
  combosCollection,
  customerAddressesCollection,
  customersCollection,
  pendingOrdersCollection,
  productsCollection,
} from "@/lib/firestore/admin-collections";
import { livePriceForVariant } from "@/lib/server/productLookup";
import type { ComboDoc, DeliveryAddressSnapshot, ProductDoc } from "@/lib/firestore/types";
import { rateLimit } from "@/lib/server/rateLimit";

const PENDING_ORDER_EXPIRY_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

const productItemSchema = z.object({
  kind: z.literal("product"),
  productId: z.string().min(1),
  variantId: z.string().min(1),
  qty: z.number().int().positive(),
  isGift: z.boolean().default(false),
  giftRecipientName: z.string().trim().nullable().default(null),
  giftMessage: z.string().trim().max(200).nullable().default(null),
  giftSenderName: z.string().trim().nullable().default(null),
  giftWrap: z.boolean().default(false),
});

const comboItemSchema = z.object({
  kind: z.literal("combo"),
  comboId: z.string().min(1),
  qty: z.number().int().positive(),
  selections: z
    .array(z.object({ productId: z.string().min(1), variantId: z.string().min(1) }))
    .default([]),
});

const requestSchema = z.object({
  items: z.array(z.discriminatedUnion("kind", [productItemSchema, comboItemSchema])).min(1, "Bag is empty"),
});

interface ComponentQty {
  productId: string;
  variantId: string;
  qty: number;
}

function comboComponentsPerUnit(combo: ComboDoc, selections: { productId: string; variantId: string }[]): ComponentQty[] {
  if (combo.type === "fixed") {
    return combo.items.map((i) => ({ productId: i.productId, variantId: i.variantId, qty: i.qty }));
  }
  if (combo.chooseCount === null || selections.length !== combo.chooseCount) return [];
  const eligibleKeys = new Set(combo.eligibleVariants.map((v) => `${v.productId}:${v.variantId}`));
  const grouped = new Map<string, ComponentQty>();
  for (const sel of selections) {
    const key = `${sel.productId}:${sel.variantId}`;
    if (!eligibleKeys.has(key)) return [];
    const existing = grouped.get(key);
    if (existing) existing.qty += 1;
    else grouped.set(key, { productId: sel.productId, variantId: sel.variantId, qty: 1 });
  }
  return [...grouped.values()];
}

function generateReferenceCode(): string {
  // 6 chars, uppercase base32-ish alphabet (no 0/O/1/I ambiguity), short
  // enough for a human to read back over WhatsApp/phone.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  let code = "";
  for (const b of bytes) code += alphabet[b % alphabet.length];
  return `KSW-WA-${code}`;
}

/**
 * Creates a pendingOrders DRAFT for a signed-in customer's "Order on
 * WhatsApp" tap — captures their uid, cart contents (re-priced from live
 * data, never trusting the client), and default saved address (if any),
 * plus a short reference code included in the WhatsApp message so admin can
 * find and one-click-convert this exact draft (see
 * app/api/admin/whatsapp-orders/[id]/convert/route.ts) instead of re-keying
 * the order from scratch. This does NOT touch stock and is NOT a sale —
 * purely a draft; recordSale only ever runs at conversion time. Guests never
 * hit this route at all (the cart drawer falls back to the old plain wa.me
 * link when not signed in), so their flow is completely unchanged.
 */
export async function POST(request: Request) {
  const limited = rateLimit(request, "account:whatsapp-order", {
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });
  if (limited) return limited;

  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }
  const input = parsed.data;

  // Re-derive prices from live data — never trust client-supplied prices,
  // same discipline as create-order/whatsapp-orders/sale, even though this
  // is only a draft (accuracy matters for what the admin reviews later).
  const comboIds = [...new Set(input.items.filter((i) => i.kind === "combo").map((i) => i.comboId))];
  const comboSnaps = await Promise.all(comboIds.map((id) => combosCollection().doc(id).get()));
  const comboMap = new Map<string, ComboDoc>();
  for (const [idx, snap] of comboSnaps.entries()) {
    const data = snap.data();
    if (!snap.exists || !data) {
      return NextResponse.json({ error: "A combo in your bag is no longer available." }, { status: 409 });
    }
    comboMap.set(comboIds[idx], data);
  }

  const comboComponentsByIndex = new Map<number, ComponentQty[]>();
  for (const [idx, item] of input.items.entries()) {
    if (item.kind !== "combo") continue;
    const combo = comboMap.get(item.comboId)!;
    const components = comboComponentsPerUnit(combo, item.selections);
    if (components.length === 0 && combo.type === "choose-any") {
      return NextResponse.json(
        { error: `"${combo.title}" needs exactly ${combo.chooseCount ?? 0} selections.` },
        { status: 400 },
      );
    }
    comboComponentsByIndex.set(idx, components);
  }

  const productIds = new Set<string>();
  input.items.forEach((item, idx) => {
    if (item.kind === "product") productIds.add(item.productId);
    else for (const c of comboComponentsByIndex.get(idx) ?? []) productIds.add(c.productId);
  });
  const productIdList = [...productIds];
  const productSnaps = await Promise.all(productIdList.map((id) => productsCollection().doc(id).get()));
  const productMap = new Map<string, ProductDoc>();
  for (const [idx, snap] of productSnaps.entries()) {
    const data = snap.data();
    if (!snap.exists || !data) {
      return NextResponse.json({ error: "A product in your bag is no longer available." }, { status: 409 });
    }
    productMap.set(productIdList[idx], data);
  }

  let subtotal = 0;
  const pendingItems = input.items.map((item) => {
    if (item.kind === "product") {
      const product = productMap.get(item.productId)!;
      const price = livePriceForVariant(product, item.variantId);
      subtotal += (price ?? 0) * item.qty;
      return {
        kind: "product" as const,
        productId: item.productId,
        variantId: item.variantId,
        qty: item.qty,
        isGift: item.isGift,
        giftRecipientName: item.giftRecipientName,
        giftMessage: item.giftMessage,
        giftSenderName: item.giftSenderName,
        giftWrap: item.giftWrap,
      };
    }
    const combo = comboMap.get(item.comboId)!;
    subtotal += combo.comboPriceInr * item.qty;
    return {
      kind: "combo" as const,
      comboId: item.comboId,
      qty: item.qty,
      selections: item.selections,
    };
  });

  const customerDoc = await customersCollection().doc(session.uid).get();
  const customerData = customerDoc.data();

  const defaultAddressSnap = await customerAddressesCollection(session.uid)
    .where("isDefault", "==", true)
    .limit(1)
    .get();
  let deliveryAddress: DeliveryAddressSnapshot | null = null;
  if (!defaultAddressSnap.empty) {
    const a = defaultAddressSnap.docs[0].data();
    deliveryAddress = {
      label: a.label,
      fullName: a.fullName,
      phone: a.phone,
      line1: a.line1,
      line2: a.line2,
      city: a.city,
      district: a.district,
      state: a.state,
      pincode: a.pincode,
      landmark: a.landmark,
    };
  }

  const referenceCode = generateReferenceCode();
  const amountPaise = Math.round(subtotal * 100);

  await pendingOrdersCollection().doc().set({
    items: pendingItems,
    customerName: customerData?.name || session.name || "KISWA Customer",
    customerPhone: deliveryAddress?.phone || customerData?.phone || "N/A",
    shippingAddress: null,
    amountPaise,
    status: "created",
    saleId: null,
    invoiceNo: null,
    createdAt: FieldValue.serverTimestamp(),
    giftShippingAddress: null,
    hidePrices: false,
    customerUid: session.uid,
    deliveryAddress,
    source: "whatsapp",
    referenceCode,
    expiresAt: Timestamp.fromDate(new Date(Date.now() + PENDING_ORDER_EXPIRY_MS)),
  });

  return NextResponse.json({ referenceCode });
}

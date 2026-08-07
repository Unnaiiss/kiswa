import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import {
  combosCollection,
  productsCollection,
  pendingOrdersCollection,
} from "@/lib/firestore/admin-collections";
import type { ComboDoc, ProductDoc } from "@/lib/firestore/types";
import { createRazorpayOrder, razorpayPublicKeyId } from "@/lib/server/razorpay";
import {
  InsufficientStockError,
  aggregateProductNeeds,
  livePriceForVariant,
} from "@/lib/server/productLookup";

const shippingAddressSchema = z.object({
  line1: z.string().trim().min(1, "Address line 1 is required"),
  line2: z.string().trim().nullable().default(null),
  city: z.string().trim().min(1, "City is required"),
  state: z.string().trim().min(1, "State is required"),
  pincode: z
    .string()
    .trim()
    .regex(/^[1-9][0-9]{5}$/, "Enter a valid 6-digit Indian PIN code"),
  country: z.literal("India").default("India"),
});

const giftShippingAddressSchema = shippingAddressSchema.extend({
  name: z.string().trim().min(1, "Recipient name is required"),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9][0-9]{9}$/, "Enter a valid 10-digit Indian mobile number"),
});

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

const itemSchema = z.discriminatedUnion("kind", [productItemSchema, comboItemSchema]);

const requestSchema = z.object({
  items: z.array(itemSchema).min(1, "Your bag is empty"),
  customerName: z.string().trim().min(1, "Name is required"),
  customerPhone: z
    .string()
    .trim()
    .regex(/^[6-9][0-9]{9}$/, "Enter a valid 10-digit Indian mobile number"),
  shippingAddress: shippingAddressSchema,
  giftShippingAddress: giftShippingAddressSchema.nullable().default(null),
  hidePrices: z.boolean().default(false),
});

interface ComponentQty {
  productId: string;
  variantId: string;
  qty: number;
}

function comboComponentsPerUnit(
  combo: ComboDoc,
  selections: { productId: string; variantId: string }[],
): ComponentQty[] {
  if (combo.type === "fixed") {
    return combo.items.map((i) => ({
      productId: i.productId,
      variantId: i.variantId,
      qty: i.qty,
    }));
  }
  if (combo.chooseCount === null || selections.length !== combo.chooseCount) {
    return [];
  }
  const eligibleKeys = new Set(
    combo.eligibleVariants.map((v) => `${v.productId}:${v.variantId}`),
  );
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

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }
  const input = parsed.data;

  // Fetch every combo referenced up front — needed both to validate/expand
  // choose-any selections and to price the line (always comboPriceInr, never
  // the sum of components).
  const comboIds = [
    ...new Set(input.items.filter((i) => i.kind === "combo").map((i) => i.comboId)),
  ];
  const comboSnaps = await Promise.all(
    comboIds.map((id) => combosCollection().doc(id).get()),
  );
  const comboMap = new Map<string, ComboDoc>();
  for (const [idx, snap] of comboSnaps.entries()) {
    const data = snap.data();
    if (!snap.exists || !data) {
      return NextResponse.json(
        { error: `A combo in your bag is no longer available.` },
        { status: 409 },
      );
    }
    const now = new Date();
    if (
      !data.isActive ||
      (data.validFrom && data.validFrom.toDate() > now) ||
      (data.validUntil && data.validUntil.toDate() < now)
    ) {
      return NextResponse.json(
        { error: `"${data.title}" is no longer available.` },
        { status: 409 },
      );
    }
    comboMap.set(comboIds[idx], data);
  }

  // Expand combo lines into their components (per one combo unit) up front,
  // and reject malformed choose-any selections before touching stock.
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

  // Aggregate requested qty per (productId, variantId) — from direct product
  // items AND every combo's expanded components × its line qty — purely to
  // check stock sufficiency and look up current prices. The actual pending
  // items written below are built from input.items directly (one per cart
  // line) so lines never collapse into each other.
  const qtyByProductVariant = new Map<string, Map<string, number>>();
  function addDraw(productId: string, variantId: string, qty: number) {
    const perVariant =
      qtyByProductVariant.get(productId) ?? new Map<string, number>();
    perVariant.set(variantId, (perVariant.get(variantId) ?? 0) + qty);
    qtyByProductVariant.set(productId, perVariant);
  }
  input.items.forEach((item, idx) => {
    if (item.kind === "product") {
      addDraw(item.productId, item.variantId, item.qty);
    } else {
      for (const c of comboComponentsByIndex.get(idx) ?? []) {
        addDraw(c.productId, c.variantId, c.qty * item.qty);
      }
    }
  });

  const products = productsCollection();
  const productIds = [...qtyByProductVariant.keys()];
  const productSnaps = await Promise.all(
    productIds.map((id) => products.doc(id).get()),
  );

  const productMap = new Map<string, ProductDoc>();
  for (const [idx, snap] of productSnaps.entries()) {
    const productId = productIds[idx];
    const product = snap.data();
    if (!snap.exists || !product || !product.isActive) {
      return NextResponse.json(
        { error: `A product in your bag is no longer available.` },
        { status: 409 },
      );
    }
    productMap.set(productId, product);
  }

  const priceByVariant = new Map<string, number>();
  for (const [productId, perVariant] of qtyByProductVariant) {
    const product = productMap.get(productId)!;
    for (const variantId of perVariant.keys()) {
      const price = livePriceForVariant(product, variantId);
      if (price === null) {
        return NextResponse.json(
          { error: `A variant in your bag is no longer available.` },
          { status: 409 },
        );
      }
      priceByVariant.set(`${productId}:${variantId}`, price);
    }
  }

  // Pre-check stock sufficiency for a fast, friendly failure before a
  // Razorpay order is even created — recordSale's own transaction (run at
  // payment-confirmation time) is still the actual authority regardless.
  try {
    aggregateProductNeeds(productMap, qtyByProductVariant);
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      return NextResponse.json(
        {
          error: `Not enough stock to make everything in your bag. Please update the quantity.`,
        },
        { status: 409 },
      );
    }
    throw err;
  }

  let subtotal = 0;
  const pendingItems = input.items.map((item) => {
    if (item.kind === "product") {
      const price = priceByVariant.get(`${item.productId}:${item.variantId}`)!;
      subtotal += price * item.qty;
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

  const amountPaise = Math.round(subtotal * 100);
  if (amountPaise <= 0) {
    return NextResponse.json({ error: "Your bag is empty" }, { status: 400 });
  }

  const receipt = `kiswa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const razorpayOrder = await createRazorpayOrder(amountPaise, receipt);

  await pendingOrdersCollection().doc(razorpayOrder.id).set({
    items: pendingItems,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    shippingAddress: input.shippingAddress,
    amountPaise,
    status: "created",
    saleId: null,
    invoiceNo: null,
    createdAt: FieldValue.serverTimestamp(),
    giftShippingAddress: input.giftShippingAddress,
    hidePrices: input.hidePrices,
  });

  return NextResponse.json({
    orderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    keyId: razorpayPublicKeyId(),
  });
}

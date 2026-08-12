import { NextResponse } from "next/server";
import { z } from "zod";
import { combosCollection, pendingOrdersCollection, productsCollection } from "@/lib/firestore/admin-collections";
import { recordSale } from "@/lib/server/recordSale";
import { AuthError, requireRole } from "@/lib/server/authGuard";
import { livePriceForVariant } from "@/lib/server/productLookup";
import { toErrorResponse } from "@/lib/server/apiError";
import type { ComboDoc, ProductDoc } from "@/lib/firestore/types";

/**
 * Converts a customer-linked WhatsApp draft (created by
 * app/api/account/whatsapp-order/route.ts when a signed-in customer tapped
 * "Order on WhatsApp") into a real sale in one click — no re-keying. Re-
 * derives every price from live product/combo data (never trusts the
 * draft's own snapshot, same discipline as every other order-recording
 * route), then calls the same recordSale transaction as POS/the manual
 * WhatsApp re-key screen, passing the draft's customerUid and
 * deliveryAddress through so the resulting sale is linked back to the
 * account. Rejects an already-converted or expired draft.
 */

const bodySchema = z.object({
  paymentMethod: z.enum(["cash", "upi", "card"]),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let decoded;
  try {
    decoded = await requireRole(request, ["admin"]);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const ref = pendingOrdersCollection().doc(id);
  const snap = await ref.get();
  const draft = snap.data();
  if (!snap.exists || !draft) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }
  if (draft.source !== "whatsapp") {
    return NextResponse.json({ error: "Not a WhatsApp draft" }, { status: 400 });
  }
  if (draft.status !== "created") {
    return NextResponse.json(
      { error: draft.status === "completed" ? "This draft was already converted." : "This draft can no longer be converted." },
      { status: 409 },
    );
  }
  if (draft.expiresAt && draft.expiresAt.toDate() < new Date()) {
    return NextResponse.json({ error: "This draft has expired." }, { status: 409 });
  }

  // Re-derive prices from live data — never trust the draft's own snapshot,
  // same discipline as every other order-recording route in this app.
  const qtyByProductVariant = new Map<string, Map<string, number>>();
  for (const item of draft.items) {
    if (item.kind !== "product") continue;
    const perVariant = qtyByProductVariant.get(item.productId) ?? new Map<string, number>();
    perVariant.set(item.variantId, (perVariant.get(item.variantId) ?? 0) + item.qty);
    qtyByProductVariant.set(item.productId, perVariant);
  }

  const productIds = [...qtyByProductVariant.keys()];
  const productSnaps = await Promise.all(productIds.map((pid) => productsCollection().doc(pid).get()));
  const priceByVariant = new Map<string, number>();
  for (const [idx, pSnap] of productSnaps.entries()) {
    const productId = productIds[idx];
    const product: ProductDoc | undefined = pSnap.data();
    if (!pSnap.exists || !product) {
      return NextResponse.json({ error: "A product in this draft no longer exists." }, { status: 409 });
    }
    const perVariant = qtyByProductVariant.get(productId)!;
    for (const variantId of perVariant.keys()) {
      const price = livePriceForVariant(product, variantId);
      if (price === null) {
        return NextResponse.json({ error: "A variant in this draft no longer exists." }, { status: 409 });
      }
      priceByVariant.set(`${productId}:${variantId}`, price);
    }
  }

  const comboIds = [...new Set(draft.items.filter((i) => i.kind === "combo").map((i) => i.comboId))];
  const comboSnaps = await Promise.all(comboIds.map((cid) => combosCollection().doc(cid).get()));
  const comboPriceById = new Map<string, number>();
  for (const [idx, cSnap] of comboSnaps.entries()) {
    const combo: ComboDoc | undefined = cSnap.data();
    if (!cSnap.exists || !combo) {
      return NextResponse.json({ error: "A combo in this draft no longer exists." }, { status: 409 });
    }
    comboPriceById.set(comboIds[idx], combo.comboPriceInr);
  }

  let subtotal = 0;
  const recordItems = draft.items.map((item) => {
    if (item.kind === "product") {
      const price = priceByVariant.get(`${item.productId}:${item.variantId}`)!;
      subtotal += price * item.qty;
      return {
        kind: "product" as const,
        productId: item.productId,
        variantId: item.variantId,
        qty: item.qty,
        isGift: item.isGift ?? false,
        giftRecipientName: item.giftRecipientName ?? null,
        giftMessage: item.giftMessage ?? null,
        giftSenderName: item.giftSenderName ?? null,
        giftWrap: item.giftWrap ?? false,
      };
    }
    const price = comboPriceById.get(item.comboId)!;
    subtotal += price * item.qty;
    return {
      kind: "combo" as const,
      comboId: item.comboId,
      qty: item.qty,
      selections: item.selections,
    };
  });

  try {
    const { saleId, invoiceNo } = await recordSale({
      channel: "online",
      customerName: draft.customerName,
      customerPhone: draft.customerPhone,
      items: recordItems,
      discount: 0,
      paymentMethod: parsed.data.paymentMethod,
      paymentStatus: "paid",
      razorpayOrderId: null,
      razorpayPaymentId: null,
      orderStatus: "paid",
      shippingAddress: null,
      createdByUid: decoded.uid,
      customerUid: draft.customerUid ?? null,
      deliveryAddress: draft.deliveryAddress ?? null,
    });

    await ref.update({ status: "completed", saleId, invoiceNo });

    return NextResponse.json({ saleId, invoiceNo, subtotal, total: subtotal });
  } catch (err) {
    return toErrorResponse(err, "admin/whatsapp-orders/convert", "Could not convert this draft.");
  }
}

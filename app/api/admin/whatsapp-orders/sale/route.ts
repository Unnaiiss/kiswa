import { NextResponse } from "next/server";
import { z } from "zod";
import { combosCollection, productsCollection } from "@/lib/firestore/admin-collections";
import { recordSale } from "@/lib/server/recordSale";
import { AuthError, requireRole } from "@/lib/server/authGuard";
import { livePriceForVariant } from "@/lib/server/productLookup";
import { toErrorResponse } from "@/lib/server/apiError";

/**
 * Records a WhatsApp-confirmed order — same recordSale transaction as the
 * POS counter (app/api/pos/sale/route.ts, which this mirrors closely), just
 * channel: "online" instead of "offline" since these originate from a
 * storefront/WhatsApp enquiry rather than a walk-in. The WhatsApp message
 * itself (lib/whatsapp.ts's buildCartOrderMessage) is enquiry-only and never
 * touches stock — this is the ONLY place a confirmed WhatsApp order becomes
 * a real sale and deducts oil ml / unit stock, via the same recordSale used
 * everywhere else (never a bespoke stock write).
 */

const productItemSchema = z.object({
  kind: z.literal("product"),
  productId: z.string().min(1),
  variantId: z.string().min(1),
  qty: z.number().int().positive(),
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
  items: z.array(z.discriminatedUnion("kind", [productItemSchema, comboItemSchema])).min(1, "Order is empty"),
  customerName: z.string().trim().optional().default(""),
  customerPhone: z.string().trim().optional().default(""),
  discount: z.object({
    mode: z.enum(["flat", "percent"]),
    value: z.number().nonnegative(),
  }),
  paymentMethod: z.enum(["cash", "upi", "card"]),
});

export async function POST(request: Request) {
  let decoded;
  try {
    decoded = await requireRole(request, ["admin"]);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
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

  // Aggregate qty per (productId, variantId) and price from live product data
  // (never trust client-supplied prices — the total charged must match what's
  // actually in Firestore right now).
  const qtyByProductVariant = new Map<string, Map<string, number>>();
  for (const item of input.items) {
    if (item.kind !== "product") continue;
    const perVariant =
      qtyByProductVariant.get(item.productId) ?? new Map<string, number>();
    perVariant.set(
      item.variantId,
      (perVariant.get(item.variantId) ?? 0) + item.qty,
    );
    qtyByProductVariant.set(item.productId, perVariant);
  }

  const products = productsCollection();
  const productIds = [...qtyByProductVariant.keys()];
  const productSnaps = await Promise.all(
    productIds.map((id) => products.doc(id).get()),
  );

  const priceByVariant = new Map<string, number>();

  for (const [idx, snap] of productSnaps.entries()) {
    const productId = productIds[idx];
    const product = snap.data();
    if (!snap.exists || !product) {
      return NextResponse.json(
        { error: "A product in the order no longer exists." },
        { status: 409 },
      );
    }
    const perVariant = qtyByProductVariant.get(productId)!;
    for (const variantId of perVariant.keys()) {
      const price = livePriceForVariant(product, variantId);
      if (price === null) {
        return NextResponse.json(
          { error: "A variant in the order no longer exists." },
          { status: 409 },
        );
      }
      priceByVariant.set(`${productId}:${variantId}`, price);
    }
  }

  // Combo prices — always the live comboPriceInr, never a sum of components
  // (and never trusted from the client).
  const comboIds = [
    ...new Set(input.items.filter((i) => i.kind === "combo").map((i) => i.comboId)),
  ];
  const comboSnaps = await Promise.all(
    comboIds.map((id) => combosCollection().doc(id).get()),
  );
  const comboPriceById = new Map<string, number>();
  for (const [idx, snap] of comboSnaps.entries()) {
    const combo = snap.data();
    if (!snap.exists || !combo) {
      return NextResponse.json(
        { error: "A combo in the order no longer exists." },
        { status: 409 },
      );
    }
    comboPriceById.set(comboIds[idx], combo.comboPriceInr);
  }

  // Price from live data (never trust client-supplied prices); built 1:1
  // from input.items (not the aggregated map above) so per-line gift-wrap
  // flags are preserved even if the same variant somehow appears twice.
  let subtotal = 0;
  const recordItems = input.items.map((item) => {
    if (item.kind === "product") {
      const price = priceByVariant.get(`${item.productId}:${item.variantId}`)!;
      subtotal += price * item.qty;
      return {
        kind: "product" as const,
        productId: item.productId,
        variantId: item.variantId,
        qty: item.qty,
        isGift: item.giftWrap,
        giftRecipientName: null,
        giftMessage: null,
        giftSenderName: null,
        giftWrap: item.giftWrap,
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

  const rawDiscount =
    input.discount.mode === "percent"
      ? (subtotal * input.discount.value) / 100
      : input.discount.value;
  const discount = Math.min(Math.max(Math.round(rawDiscount), 0), subtotal);

  try {
    const { saleId, invoiceNo } = await recordSale({
      channel: "online",
      customerName: input.customerName || "WhatsApp Customer",
      customerPhone: input.customerPhone || "N/A",
      items: recordItems,
      discount,
      paymentMethod: input.paymentMethod,
      paymentStatus: "paid",
      razorpayOrderId: null,
      razorpayPaymentId: null,
      orderStatus: "pending",
      shippingAddress: null,
      createdByUid: decoded.uid,
      createdByName: decoded.name ?? null,
    });

    return NextResponse.json({
      saleId,
      invoiceNo,
      subtotal,
      discount,
      total: subtotal - discount,
    });
  } catch (err) {
    return toErrorResponse(err, "admin/whatsapp-orders/sale", "Could not complete the order.");
  }
}

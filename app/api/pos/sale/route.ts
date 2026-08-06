import { NextResponse } from "next/server";
import { z } from "zod";
import { productsCollection } from "@/lib/firestore/admin-collections";
import { recordSale } from "@/lib/server/recordSale";
import { AuthError, requireRole } from "@/lib/server/authGuard";

const requestSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().min(1),
        qty: z.number().int().positive(),
        giftWrap: z.boolean().default(false),
      }),
    )
    .min(1, "Bill is empty"),
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
    decoded = await requireRole(request, ["staff", "admin"]);
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
        { error: "A product in the bill no longer exists." },
        { status: 409 },
      );
    }
    const perVariant = qtyByProductVariant.get(productId)!;
    for (const variantId of perVariant.keys()) {
      const variant = product.variants.find((v) => v.variantId === variantId);
      if (!variant) {
        return NextResponse.json(
          { error: "A variant in the bill no longer exists." },
          { status: 409 },
        );
      }
      priceByVariant.set(`${productId}:${variantId}`, variant.priceInr);
    }
  }

  // Price from live product data (never trust client-supplied prices); built
  // 1:1 from input.items (not the aggregated map above) so per-line gift-wrap
  // flags are preserved even if the same variant somehow appears twice.
  let subtotal = 0;
  const recordItems = input.items.map((item) => {
    const price = priceByVariant.get(`${item.productId}:${item.variantId}`)!;
    subtotal += price * item.qty;
    return {
      productId: item.productId,
      variantId: item.variantId,
      qty: item.qty,
      isGift: item.giftWrap,
      giftRecipientName: null,
      giftMessage: null,
      giftSenderName: null,
      giftWrap: item.giftWrap,
    };
  });

  const rawDiscount =
    input.discount.mode === "percent"
      ? (subtotal * input.discount.value) / 100
      : input.discount.value;
  const discount = Math.min(Math.max(Math.round(rawDiscount), 0), subtotal);

  try {
    const { saleId, invoiceNo } = await recordSale({
      channel: "offline",
      customerName: input.customerName || "Walk-in Customer",
      customerPhone: input.customerPhone || "N/A",
      items: recordItems,
      discount,
      paymentMethod: input.paymentMethod,
      paymentStatus: "paid",
      razorpayOrderId: null,
      razorpayPaymentId: null,
      orderStatus: "paid",
      shippingAddress: null,
      createdByUid: decoded.uid,
    });

    return NextResponse.json({
      saleId,
      invoiceNo,
      subtotal,
      discount,
      total: subtotal - discount,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not complete the sale.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}

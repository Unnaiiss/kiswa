import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { productsCollection, pendingOrdersCollection } from "@/lib/firestore/admin-collections";
import { createRazorpayOrder, razorpayPublicKeyId } from "@/lib/server/razorpay";

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

const requestSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().min(1),
        qty: z.number().int().positive(),
      }),
    )
    .min(1, "Your bag is empty"),
  customerName: z.string().trim().min(1, "Name is required"),
  customerPhone: z
    .string()
    .trim()
    .regex(/^[6-9][0-9]{9}$/, "Enter a valid 10-digit Indian mobile number"),
  shippingAddress: shippingAddressSchema,
});

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

  // Aggregate requested qty per (productId, variantId) — the same variant
  // can appear more than once if the cart was built across visits.
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

  const pendingItems: { productId: string; variantId: string; qty: number }[] = [];
  let subtotal = 0;

  for (const [idx, snap] of productSnaps.entries()) {
    const productId = productIds[idx];
    const product = snap.data();
    if (!snap.exists || !product || !product.isActive) {
      return NextResponse.json(
        { error: `A product in your bag is no longer available.` },
        { status: 409 },
      );
    }
    const perVariant = qtyByProductVariant.get(productId)!;
    let mlNeeded = 0;
    for (const [variantId, qty] of perVariant) {
      const variant = product.variants.find((v) => v.variantId === variantId);
      if (!variant || !variant.isActive) {
        return NextResponse.json(
          { error: `A variant in your bag is no longer available.` },
          { status: 409 },
        );
      }
      mlNeeded += qty * variant.oilMlPerUnit;
      subtotal += variant.priceInr * qty;
      pendingItems.push({ productId, variantId, qty });
    }
    if (product.oilStockMl < mlNeeded) {
      return NextResponse.json(
        {
          error: `Not enough ${product.name} in stock to make everything in your bag. Please update the quantity.`,
        },
        { status: 409 },
      );
    }
  }

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
  });

  return NextResponse.json({
    orderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    keyId: razorpayPublicKeyId(),
  });
}

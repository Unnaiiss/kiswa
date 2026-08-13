import { NextResponse } from "next/server";
import { z } from "zod";
import { getCustomerSession } from "@/lib/server/getCustomerSession";
import { getAddressById, toDeliveryAddressSnapshot } from "@/lib/server/customerAddresses";
import { checkoutSettingsDocRef } from "@/lib/firestore/admin-collections";
import { recordSale } from "@/lib/server/recordSale";
import { rateLimit } from "@/lib/server/rateLimit";
import { toErrorResponse } from "@/lib/server/apiError";

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

const shippingAddressSchema = z.object({
  line1: z.string().trim().min(1),
  line2: z.string().trim().nullable().default(null),
  city: z.string().trim().min(1),
  state: z.string().trim().min(1),
  pincode: z.string().trim().regex(/^[1-9][0-9]{5}$/),
  country: z.literal("India").default("India"),
});

const giftShippingAddressSchema = shippingAddressSchema.extend({
  name: z.string().trim().min(1),
  phone: z.string().trim().regex(/^[6-9][0-9]{9}$/),
});

const requestSchema = z.object({
  items: z.array(z.discriminatedUnion("kind", [productItemSchema, comboItemSchema])).min(1, "Your bag is empty"),
  addressId: z.string().min(1, "Choose a delivery address"),
  hidePrices: z.boolean().default(false),
  giftShippingAddress: giftShippingAddressSchema.nullable().default(null),
});

/**
 * Cash on Delivery — the only online checkout path that calls recordSale
 * DIRECTLY rather than through the pendingOrders + Razorpay-verification
 * dance, since there's no payment to verify yet. Still online-channel,
 * still stock-decrementing, still invoice-issuing, immediately — the only
 * thing that stays 'pending' is paymentStatus (see PATCH
 * /api/admin/sales/[id]/mark-paid for how an admin flips it once the
 * courier actually collects payment). codEnabled is re-checked server-side
 * regardless of what the client sends or was rendered — never trust the
 * client on whether this payment method is even allowed right now.
 */
export async function POST(request: Request) {
  const limited = rateLimit(request, "checkout:cod", { limit: 10, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Please sign in to check out." }, { status: 401 });
  }

  const settingsSnap = await checkoutSettingsDocRef().get();
  if (!settingsSnap.data()?.codEnabled) {
    return NextResponse.json({ error: "Cash on Delivery isn't available right now." }, { status: 403 });
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

  const address = await getAddressById(session.uid, input.addressId);
  if (!address) {
    return NextResponse.json(
      { error: "That address couldn't be found. Please choose or add one." },
      { status: 400 },
    );
  }

  try {
    const { saleId, invoiceNo } = await recordSale({
      channel: "online",
      customerName: address.fullName,
      customerPhone: address.phone,
      items: input.items,
      discount: 0,
      paymentMethod: "cod",
      paymentStatus: "pending",
      razorpayOrderId: null,
      razorpayPaymentId: null,
      orderStatus: "pending",
      shippingAddress: null,
      createdByUid: "online-checkout",
      createdByName: "System (Cash on Delivery order placed)",
      giftShippingAddress: input.giftShippingAddress,
      hidePrices: input.hidePrices,
      customerUid: session.uid,
      deliveryAddress: toDeliveryAddressSnapshot(address),
    });

    return NextResponse.json({ saleId, invoiceNo });
  } catch (err) {
    return toErrorResponse(err, "checkout/cod", "Could not place your order.");
  }
}

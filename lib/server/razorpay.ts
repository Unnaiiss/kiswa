import crypto from "node:crypto";

function keyId(): string {
  const v = process.env.RAZORPAY_KEY_ID;
  if (!v) throw new Error("RAZORPAY_KEY_ID env var is not set");
  return v;
}

function keySecret(): string {
  const v = process.env.RAZORPAY_KEY_SECRET;
  if (!v) throw new Error("RAZORPAY_KEY_SECRET env var is not set");
  return v;
}

function webhookSecret(): string {
  const v = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!v) throw new Error("RAZORPAY_WEBHOOK_SECRET env var is not set");
  return v;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
}

/** Creates a Razorpay order for `amountPaise` (integer, smallest currency unit). */
export async function createRazorpayOrder(
  amountPaise: number,
  receipt: string,
): Promise<RazorpayOrder> {
  const auth = Buffer.from(`${keyId()}:${keySecret()}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: "INR",
      receipt,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Razorpay order creation failed (${res.status}): ${body}`);
  }

  return res.json();
}

/** The client-facing key id, safe to send to the browser for Checkout.js. */
export function razorpayPublicKeyId(): string {
  return keyId();
}

/**
 * Verifies the order_id|payment_id signature Razorpay's Checkout.js handler
 * returns after a successful payment.
 */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  const expected = crypto
    .createHmac("sha256", keySecret())
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return safeEqual(expected, signature);
}

/** Verifies the X-Razorpay-Signature header over the raw webhook body. */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
): boolean {
  const expected = crypto
    .createHmac("sha256", webhookSecret())
    .update(rawBody)
    .digest("hex");
  return safeEqual(expected, signature);
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { paymentAttemptsCollection, pendingOrdersCollection } from "@/lib/firestore/admin-collections";
import { rateLimit } from "@/lib/server/rateLimit";

const requestSchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().nullable().default(null),
  reason: z.string().trim().max(500).nullable().default(null),
});

/**
 * Client-reported "this payment attempt failed" — fired from
 * checkout-form.tsx's `rzp.on("payment.failed", ...)` handler. Purely
 * telemetry (the "every payment attempt logged with its Razorpay IDs and
 * status" correctness requirement): recordSale is never called from here,
 * nothing is deducted, this only logs the attempt and marks the pending
 * order 'failed' so it stops looking like an open/abandoned checkout.
 * Razorpay's own payment.failed WEBHOOK event (app/api/razorpay/webhook/
 * route.ts) is the authoritative backup for this same signal, in case the
 * customer's tab closes before this fires — both paths converge on the
 * same paymentAttempts doc (keyed by payment id), so whichever arrives
 * first "wins" and the other is a harmless overwrite with the same data.
 */
export async function POST(request: Request) {
  const limited = rateLimit(request, "checkout:payment-failed", {
    limit: 30,
    windowMs: 10 * 60 * 1000,
  });
  if (limited) return limited;

  const json = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { razorpayOrderId, razorpayPaymentId, reason } = parsed.data;

  if (razorpayPaymentId) {
    await paymentAttemptsCollection().doc(razorpayPaymentId).set({
      razorpayOrderId,
      razorpayPaymentId,
      status: "failed",
      reason,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  const pendingRef = pendingOrdersCollection().doc(razorpayOrderId);
  const snap = await pendingRef.get();
  const data = snap.data();
  if (data && (data.status === "created" || data.status === "processing")) {
    await pendingRef.update({ status: "failed" });
  }

  return NextResponse.json({ ok: true });
}

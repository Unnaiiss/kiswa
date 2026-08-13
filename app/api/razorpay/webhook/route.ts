import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { verifyWebhookSignature } from "@/lib/server/razorpay";
import { finalizeOnlineOrder } from "@/lib/server/finalizeOnlineOrder";
import { paymentAttemptsCollection, pendingOrdersCollection } from "@/lib/firestore/admin-collections";

interface RazorpayWebhookPayload {
  event: string;
  payload: {
    payment: {
      entity: {
        id: string;
        order_id: string;
        status: string;
        error_description?: string | null;
      };
    };
  };
}

/**
 * Backup confirmation path, both directions:
 * - payment.captured: catches a payment even if the customer closed the tab
 *   before Checkout.js's own redirect handler could call
 *   /api/checkout/verify. finalizeOnlineOrder is idempotent (a durable
 *   'created' -> 'processing' -> 'completed' lock), so this is safe to run
 *   whether or not verify already handled the same order — a duplicate
 *   webhook delivery (Razorpay itself retries on a non-2xx/timeout) just
 *   hits the "already completed" branch and does nothing further.
 * - payment.failed: the server-side backup for app/api/checkout/
 *   payment-failed/route.ts's client-reported version of the same signal,
 *   for when the customer's tab closes before that fires. Never calls
 *   recordSale, never touches stock — purely logs the attempt and marks
 *   the pending order 'failed' so it stops looking like an open checkout.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let body: RazorpayWebhookPayload;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (body.event === "payment.captured") {
    const payment = body.payload.payment.entity;
    await finalizeOnlineOrder(payment.order_id, payment.id);
  } else if (body.event === "payment.failed") {
    const payment = body.payload.payment.entity;
    // Doc id is the payment id — a retried webhook delivery for the same
    // failed attempt overwrites the same doc rather than duplicating it.
    await paymentAttemptsCollection().doc(payment.id).set({
      razorpayOrderId: payment.order_id,
      razorpayPaymentId: payment.id,
      status: "failed",
      reason: payment.error_description ?? null,
      createdAt: FieldValue.serverTimestamp(),
    });

    const pendingRef = pendingOrdersCollection().doc(payment.order_id);
    const snap = await pendingRef.get();
    const data = snap.data();
    if (data && (data.status === "created" || data.status === "processing")) {
      await pendingRef.update({ status: "failed" });
    }
  }

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/server/razorpay";
import { finalizeOnlineOrder } from "@/lib/server/finalizeOnlineOrder";

interface RazorpayWebhookPayload {
  event: string;
  payload: {
    payment: {
      entity: {
        id: string;
        order_id: string;
        status: string;
      };
    };
  };
}

// Backup confirmation path: catches payments captured even if the customer
// closed the tab before the Checkout.js redirect handler could call
// /api/checkout/verify. finalizeOnlineOrder is idempotent, so this is safe
// to run whether or not verify already handled the same order.
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
  }

  return NextResponse.json({ ok: true });
}

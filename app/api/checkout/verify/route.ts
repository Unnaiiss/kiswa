import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPaymentSignature } from "@/lib/server/razorpay";
import { finalizeOnlineOrder } from "@/lib/server/finalizeOnlineOrder";

const requestSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const {
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
  } = parsed.data;

  if (!verifyPaymentSignature(orderId, paymentId, signature)) {
    return NextResponse.json(
      { error: "Payment signature verification failed" },
      { status: 400 },
    );
  }

  const result = await finalizeOnlineOrder(orderId, paymentId);

  switch (result.status) {
    case "completed":
      return NextResponse.json({
        ok: true,
        invoiceNo: result.invoiceNo,
        orderId,
      });
    case "already_completed":
      return NextResponse.json({
        ok: true,
        invoiceNo: result.invoiceNo,
        orderId,
      });
    case "refund_flagged":
      return NextResponse.json({
        ok: true,
        refundFlagged: true,
        orderId,
      });
    case "conflict":
      return NextResponse.json(
        { ok: false, retry: true, error: "Payment is still being processed" },
        { status: 202 },
      );
    case "not_found":
      return NextResponse.json(
        { ok: false, error: "Order not found" },
        { status: 404 },
      );
  }
}

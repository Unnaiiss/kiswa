import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import {
  pendingOrdersCollection,
  refundFlagsCollection,
} from "@/lib/firestore/admin-collections";
import type { PendingOrderDoc } from "@/lib/firestore/types";
import { recordSale } from "./recordSale";

export type FinalizeResult =
  | { status: "completed"; saleId: string; invoiceNo: string }
  | { status: "already_completed"; saleId: string | null; invoiceNo: string | null }
  | { status: "refund_flagged" }
  | { status: "not_found" }
  | { status: "conflict" };

type LockResult =
  | { ok: true; data: PendingOrderDoc }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "already"; status: PendingOrderDoc["status"]; saleId: string | null; invoiceNo: string | null };

/**
 * Verifies a captured Razorpay payment against its pendingOrder and, exactly
 * once, turns it into a sale via recordSale (which re-checks stock inside
 * its own transaction). Safe to call more than once for the same order —
 * the redirect handler and the webhook both call this, racing.
 */
export async function finalizeOnlineOrder(
  razorpayOrderId: string,
  razorpayPaymentId: string,
): Promise<FinalizeResult> {
  const pendingRef = pendingOrdersCollection().doc(razorpayOrderId);

  // Lock: atomically move 'created' -> 'processing', or report whatever
  // state the order is already in so the caller can act idempotently.
  const lock = await adminDb.runTransaction<LockResult>(async (tx) => {
    const snap = await tx.get(pendingRef);
    const data = snap.data();
    if (!snap.exists || !data) return { ok: false, reason: "not_found" };
    if (data.status !== "created") {
      return {
        ok: false,
        reason: "already",
        status: data.status,
        saleId: data.saleId,
        invoiceNo: data.invoiceNo,
      };
    }
    tx.update(pendingRef, { status: "processing" });
    return { ok: true, data };
  });

  if (!lock.ok) {
    if (lock.reason === "not_found") return { status: "not_found" };
    if (lock.status === "completed") {
      return {
        status: "already_completed",
        saleId: lock.saleId,
        invoiceNo: lock.invoiceNo,
      };
    }
    if (lock.status === "refund_flagged") return { status: "refund_flagged" };
    return { status: "conflict" };
  }

  const pending = lock.data;

  try {
    const { saleId, invoiceNo } = await recordSale({
      channel: "online",
      customerName: pending.customerName,
      customerPhone: pending.customerPhone,
      items: pending.items,
      discount: 0,
      paymentMethod: "razorpay",
      paymentStatus: "paid",
      razorpayOrderId,
      razorpayPaymentId,
      orderStatus: "pending",
      shippingAddress: pending.shippingAddress,
      createdByUid: "online-checkout",
      createdByName: "System (Razorpay payment confirmed)",
      giftShippingAddress: pending.giftShippingAddress ?? null,
      hidePrices: pending.hidePrices ?? false,
      customerUid: pending.customerUid ?? null,
      deliveryAddress: pending.deliveryAddress ?? null,
    });

    await pendingRef.update({ status: "completed", saleId, invoiceNo });
    return { status: "completed", saleId, invoiceNo };
  } catch (err) {
    // recordSale's transactional stock re-check rejected this sale — a
    // variant sold out between order creation and payment capture. Razorpay
    // already captured the money and stock was NOT touched (the transaction
    // threw before any writes), so flag it for a manual refund instead of
    // oversell­ing or silently losing the payment.
    const reason = err instanceof Error ? err.message : String(err);
    await refundFlagsCollection().add({
      razorpayOrderId,
      razorpayPaymentId,
      customerName: pending.customerName,
      customerPhone: pending.customerPhone,
      items: pending.items,
      amountPaise: pending.amountPaise,
      // Non-null: finalizeOnlineOrder is only ever invoked for a Razorpay-
      // sourced pendingOrder (see its own doc comment above), which always
      // has shippingAddress set — only WhatsApp-sourced drafts (a separate,
      // non-payment flow that never reaches this catch block at all) can
      // have it null, which is why the type is nullable at all now.
      shippingAddress: pending.shippingAddress!,
      reason,
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
    });
    await pendingRef.update({ status: "refund_flagged" });
    return { status: "refund_flagged" };
  }
}

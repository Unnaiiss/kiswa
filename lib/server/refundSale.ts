import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { productsCollection, salesCollection, stockMovementsCollection } from "@/lib/firestore/admin-collections";
import { PublicError } from "@/lib/server/publicError";
import {
  ORDER_STATUS_LABELS,
  TERMINAL_ORDER_STATUSES,
  computeRestockDraws,
  normalizeOrderStatus,
} from "@/lib/orderFulfillment";
import type { OrderStatus, OrderStatusHistoryEntry, RefundRecord } from "@/lib/firestore/types";

/**
 * Records a refund against a sale — the one code path that ever writes
 * SaleDoc.refund. Actual money movement always happens elsewhere (the
 * Razorpay dashboard, or in person for cash/UPI/card/COD); this only keeps
 * KISWA's own record, sets paymentStatus to 'refunded', and — when
 * `restock` is true — restores stock via the SAME computeRestockDraws /
 * order-status-transition machinery cancel/return already use, in the
 * SAME transaction as the refund fields, so a partial failure can never
 * leave stock restored without the refund reflecting it (or vice versa).
 *
 * Restocking picks the target status deterministically the same way the
 * state machine would ('returned' only from 'delivered', 'cancelled'
 * otherwise) rather than accepting it as a caller-supplied parameter — an
 * already cancelled/returned order is rejected for restock (stock was
 * already restored by that earlier transition; restocking again here
 * would double-restock) with a clear message telling the admin to record
 * the refund without restocking instead, which IS allowed on any status
 * (a goodwill refund, or one for an order whose stock is already settled).
 */
export async function recordRefund(params: {
  saleId: string;
  status: "pending" | "completed";
  amountInr: number;
  reason: string;
  restock: boolean;
  actingUid: string;
  actingName: string | null;
}): Promise<void> {
  const { saleId, status, amountInr, reason, restock, actingUid, actingName } = params;
  const saleRef = salesCollection().doc(saleId);
  const products = productsCollection();
  const movements = stockMovementsCollection();

  await adminDb.runTransaction(async (tx) => {
    // ---- ALL READS FIRST ----
    const saleSnap = await tx.get(saleRef);
    const sale = saleSnap.data();
    if (!saleSnap.exists || !sale) {
      throw new PublicError(`Order ${saleId} not found`);
    }
    if (amountInr <= 0 || amountInr > sale.total) {
      throw new PublicError(`Refund amount must be between ₹1 and ₹${sale.total} (the order total).`);
    }

    const currentStatus = normalizeOrderStatus(sale.orderStatus);
    let targetStatus: OrderStatus | null = null;
    if (restock) {
      if (TERMINAL_ORDER_STATUSES.includes(currentStatus)) {
        throw new PublicError(
          `This order is already ${ORDER_STATUS_LABELS[currentStatus].toLowerCase()} — stock was already restored by that. Record this refund without restocking.`,
        );
      }
      targetStatus = currentStatus === "delivered" ? "returned" : "cancelled";
    }

    const draws = targetStatus ? computeRestockDraws(sale, targetStatus) : [];
    const totalByProduct = new Map<string, number>();
    for (const draw of draws) {
      totalByProduct.set(draw.productId, (totalByProduct.get(draw.productId) ?? 0) + draw.amount);
    }
    const productIds = [...totalByProduct.keys()];
    const productSnaps = await Promise.all(productIds.map((id) => tx.get(products.doc(id))));

    // ---- WRITES ----
    if (targetStatus) {
      const existingProductIds = new Set<string>();
      productSnaps.forEach((snap, idx) => {
        const productId = productIds[idx];
        const product = snap.data();
        if (!snap.exists || !product) return; // deleted since the sale — nothing to restock it to
        existingProductIds.add(productId);
        const totalRestore = totalByProduct.get(productId)!;
        if (product.productType === "imported") {
          tx.update(products.doc(productId), { unitStock: product.unitStock + totalRestore });
        } else {
          tx.update(products.doc(productId), { oilStockMl: product.oilStockMl + totalRestore });
        }
      });

      for (const draw of draws) {
        if (!existingProductIds.has(draw.productId)) continue;
        tx.set(movements.doc(), {
          productId: draw.productId,
          productName: draw.productName,
          variantId: draw.variantId,
          variantLabel: draw.variantLabel,
          mlChange: draw.amount,
          unit: draw.kind === "imported" ? "unit" : "ml",
          reason: "return",
          referenceId: saleId,
          note: draw.note,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    }

    const refund: RefundRecord = {
      status,
      amountInr,
      reason,
      restocked: restock,
      recordedByUid: actingUid,
      recordedByName: actingName,
      recordedAt: Timestamp.now(),
    };

    const update: { refund: RefundRecord; paymentStatus: "refunded"; orderStatus?: OrderStatus; statusHistory?: OrderStatusHistoryEntry[] } = {
      refund,
      paymentStatus: "refunded",
    };

    if (targetStatus) {
      const historyEntry: OrderStatusHistoryEntry = {
        status: targetStatus,
        timestamp: Timestamp.now(),
        changedByUid: actingUid,
        changedByName: actingName,
        note: `Refund recorded: ₹${amountInr} — ${reason}`,
      };
      update.orderStatus = targetStatus;
      update.statusHistory = [...(sale.statusHistory ?? []), historyEntry];
    }

    tx.update(saleRef, update);
  });
}

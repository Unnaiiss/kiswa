import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { productsCollection, salesCollection, stockMovementsCollection } from "@/lib/firestore/admin-collections";
import { PublicError } from "@/lib/server/publicError";
import {
  computeRestockDraws,
  isValidStatusTransition,
  normalizeOrderStatus,
} from "@/lib/orderFulfillment";
import type { OrderStatus, OrderStatusHistoryEntry } from "@/lib/firestore/types";

/**
 * The one place an order's fulfillment status ever changes — replaces the
 * old restockCancelledSale.ts (same restock logic, now shared with
 * 'returned' via lib/orderFulfillment.ts's computeRestockDraws, which this
 * calls verbatim rather than re-deriving so the confirmation dialog's
 * client-side preview can never drift from what actually happens here).
 *
 * Every call appends exactly one entry to statusHistory (see
 * OrderStatusHistoryEntry) and, for 'cancelled'/'returned', restores stock
 * via proper stockMovements in the SAME transaction as the status flip —
 * either the whole thing commits or none of it does, so a partial failure
 * can never leave stock restored without the status reflecting it (or vice
 * versa).
 *
 * isValidStatusTransition is re-checked HERE, inside the transaction, not
 * just by the API route calling this — the route also checks it up front
 * for a fast/friendly error, but this is the actual authority (same
 * "server re-validates, never trusts the caller" principle as
 * aggregateProductNeeds in recordSale). In particular this is what makes a
 * cancelled/returned order structurally un-re-cancellable and
 * un-re-returnable: TERMINAL_ORDER_STATUSES has no valid outgoing
 * transitions at all, by construction, not by a bolted-on special case.
 * Deliberately no "undo" path back out of cancelled/returned — reversing a
 * restock automatically risks silently overselling if stock moved in the
 * meantime, which is a worse failure than requiring a fresh manual Stock
 * Adjustment if a cancellation was made in error.
 */
export async function updateOrderStatus(params: {
  saleId: string;
  newStatus: OrderStatus;
  actingUid: string;
  actingName: string | null;
  note?: string | null;
}): Promise<void> {
  const { saleId, newStatus, actingUid, actingName, note } = params;
  const saleRef = salesCollection().doc(saleId);
  const products = productsCollection();
  const movements = stockMovementsCollection();

  const isRestocking = newStatus === "cancelled" || newStatus === "returned";

  await adminDb.runTransaction(async (tx) => {
    // ---- ALL READS FIRST ----
    const saleSnap = await tx.get(saleRef);
    const sale = saleSnap.data();
    if (!saleSnap.exists || !sale) {
      throw new PublicError(`Order ${saleId} not found`);
    }

    const currentStatus = normalizeOrderStatus(sale.orderStatus);
    if (!isValidStatusTransition(currentStatus, newStatus)) {
      throw new PublicError(
        `Cannot move this order from "${currentStatus}" to "${newStatus}".`,
      );
    }

    const draws = isRestocking ? computeRestockDraws(sale, newStatus) : [];
    const totalByProduct = new Map<string, number>();
    for (const draw of draws) {
      totalByProduct.set(draw.productId, (totalByProduct.get(draw.productId) ?? 0) + draw.amount);
    }
    const productIds = [...totalByProduct.keys()];
    const productSnaps = await Promise.all(productIds.map((id) => tx.get(products.doc(id))));

    // ---- WRITES ----
    if (isRestocking) {
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

    // FieldValue.serverTimestamp() isn't allowed inside array elements
    // (only as a plain top-level/map field), so this entry's own timestamp
    // is a real Timestamp.now() rather than a server sentinel — see
    // OrderStatusHistoryEntry's doc comment.
    const historyEntry: OrderStatusHistoryEntry = {
      status: newStatus,
      timestamp: Timestamp.now(),
      changedByUid: actingUid,
      changedByName: actingName,
      note: note ?? null,
    };
    const existingHistory = sale.statusHistory ?? [];

    tx.update(saleRef, {
      orderStatus: newStatus,
      statusHistory: [...existingHistory, historyEntry],
    });
  });
}

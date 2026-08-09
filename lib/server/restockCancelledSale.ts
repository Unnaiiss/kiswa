import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { productsCollection, salesCollection, stockMovementsCollection } from "@/lib/firestore/admin-collections";
import { PublicError } from "@/lib/server/publicError";

/**
 * Reverses the stock recordSale deducted for a sale, run when an order's
 * status is set to 'cancelled' — before this, cancelling an order updated
 * orderStatus only and left oilStockMl/unitStock exactly as the sale had
 * left them, silently drifting stock low with no audit trail tying the gap
 * back to the cancellation (staff had to remember a manual Stock Adjustment,
 * with no prompt or link to do so). Writes stockMovements with reason
 * 'return' (an enum value that existed but was never actually written by
 * any code path until now) referencing the sale, one movement per ORIGINAL
 * source line — mirroring recordSale's own movementDraws — so a direct
 * line and a combo component restock as separate, separately-noted
 * movements even when they share the same productId+variantId, keeping
 * the audit trail as itemized as the original deduction was.
 *
 * Flips orderStatus to 'cancelled' itself, in the SAME transaction as the
 * restock — the caller (app/api/admin/sales/[id]/status/route.ts) should
 * call this INSTEAD OF its own plain orderStatus update whenever the new
 * status is 'cancelled', so the status flip and the restock can never end
 * up split by a partial failure. Throws if the sale is already cancelled
 * (idempotency guard lives inside the transaction, not just the caller).
 *
 * Un-cancelling back to e.g. 'paid' does
 * NOT re-deduct stock automatically; that direction is intentionally left
 * to a manual Stock Adjustment, since auto-re-deducting on every possible
 * status transition risks silently overselling if stock moved in the
 * meantime, which is a materially worse outcome than an admin needing to
 * check current stock before manually correcting it.
 */
export async function restockCancelledSale(saleId: string): Promise<void> {
  const saleRef = salesCollection().doc(saleId);
  const products = productsCollection();
  const movements = stockMovementsCollection();

  await adminDb.runTransaction(async (tx) => {
    // ---- ALL READS FIRST ----
    const saleSnap = await tx.get(saleRef);
    const sale = saleSnap.data();
    if (!saleSnap.exists || !sale) {
      throw new PublicError(`Sale ${saleId} not found`);
    }
    // Idempotency guard lives here (not just in the caller) so this
    // function is itself safe to call twice — the whole point of doing the
    // status flip in the SAME transaction as the restock below.
    if (sale.orderStatus === "cancelled") {
      throw new PublicError(`Sale ${saleId} is already cancelled`);
    }

    // One restore draw per ORIGINAL source line (mirroring recordSale's own
    // movementDraws — a direct line and a combo component stay separate
    // entries here even when they land on the same productId+variantId, so
    // the audit trail keeps the same per-source granularity the original
    // deduction had). Totals per product are summed separately below for
    // the single stock write each product needs.
    interface RestoreDraw {
      productId: string;
      productName: string;
      variantId: string | null;
      variantLabel: string | null;
      amount: number;
      kind: "attar" | "imported";
      note: string;
    }
    const draws: RestoreDraw[] = [];

    for (const item of sale.items) {
      if (item.comboComponents && item.comboComponents.length > 0) {
        for (const c of item.comboComponents) {
          const isImported = c.productType === "imported";
          const amount = isImported ? c.qty : c.oilMlUsed;
          if (amount <= 0) continue;
          draws.push({
            productId: c.productId,
            productName: c.productName,
            variantId: isImported ? null : c.variantId,
            variantLabel: c.variantLabel,
            amount,
            kind: isImported ? "imported" : "attar",
            note: `Order ${sale.invoiceNo} cancelled — Combo: ${item.comboTitle ?? item.productName}`,
          });
        }
        continue;
      }
      const isImported = item.productType === "imported";
      const amount = isImported ? item.qty : (item.oilMlUsed ?? 0);
      if (amount <= 0) continue;
      draws.push({
        productId: item.productId,
        productName: item.productName,
        variantId: isImported ? null : item.variantId,
        variantLabel: isImported ? (item.sizeLabel ?? null) : null,
        amount,
        kind: isImported ? "imported" : "attar",
        note: `Order ${sale.invoiceNo} cancelled`,
      });
    }

    const totalByProduct = new Map<string, number>();
    for (const draw of draws) {
      totalByProduct.set(draw.productId, (totalByProduct.get(draw.productId) ?? 0) + draw.amount);
    }

    const productIds = [...totalByProduct.keys()];
    const productSnaps = await Promise.all(productIds.map((id) => tx.get(products.doc(id))));

    // ---- WRITE ----
    const existingProductIds = new Set<string>();
    productSnaps.forEach((snap, idx) => {
      const productId = productIds[idx];
      const product = snap.data();
      if (!snap.exists || !product) {
        // Product was deleted since the sale — nothing to restock it to;
        // skip rather than failing the whole cancellation.
        return;
      }
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

    // Same transaction as the restock above — either the whole
    // cancel-and-restock happens, or none of it does.
    tx.update(saleRef, { orderStatus: "cancelled" });
  });
}

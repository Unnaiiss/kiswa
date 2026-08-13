import {
  productsCollection,
  salesCollection,
  stockMovementsCollection,
} from "@/lib/firestore/admin-collections";

/**
 * Read-only production audit: proves stock deducts exactly once per order
 * across every channel (online/offline/COD/combo), by reconciling each
 * active product's CURRENT oilStockMl/unitStock against the sum of every
 * stockMovements.mlChange ever recorded for it. If any sale ever double-
 * deducted (or a bug skipped a deduction), this sum would diverge from the
 * live stock value. Separately checks that no sale has more than one set of
 * sale-reason movements for the same (productId, variantId) draw, which
 * would indicate a duplicate-write bug even if the running total happened
 * to still reconcile by coincidence.
 *
 * Entirely read-only — makes no writes. Safe to run against production.
 */

let issues = 0;
function report(ok: boolean, description: string) {
  if (ok) {
    console.log(`  OK: ${description}`);
  } else {
    console.log(`  MISMATCH: ${description}`);
    issues++;
  }
}

async function main() {
  console.log("== 1. Per-product reconciliation: current stock vs. sum of all movements ==\n");

  const productsSnap = await productsCollection().get();
  for (const doc of productsSnap.docs) {
    const product = doc.data();
    if (!product.isActive) continue;

    const movementsSnap = await stockMovementsCollection()
      .where("productId", "==", doc.id)
      .get();

    let ancientSkipped = 0;
    const sum = movementsSnap.docs.reduce((total, m) => {
      const data = m.data();
      // Movements from the old per-variant-bottle model (before the
      // bulk-oil migration) recorded a `qtyChange` field, not `mlChange` —
      // migrate-to-bulk-oil.ts resets oilStockMl to 0 at that boundary
      // without a bridging movement, so these ancient docs aren't part of
      // the current stock's derivation at all and must be skipped, not
      // treated as 0 (which `+ undefined` would silently NOT do — it'd
      // poison the whole sum with NaN).
      if (typeof data.mlChange !== "number") {
        ancientSkipped++;
        return total;
      }
      const unit = data.unit ?? "ml"; // missing on movements predating the field — always ml
      const isImportedUnit = unit === "unit";
      // For an attar product, only ml-unit movements are meaningful; a
      // product's productType is fixed at creation so it never has both.
      if (product.productType === "imported" && !isImportedUnit) return total;
      if (product.productType === "attar" && isImportedUnit) return total;
      return total + data.mlChange;
    }, 0);
    if (ancientSkipped > 0) {
      console.log(`    (skipped ${ancientSkipped} pre-bulk-oil-migration movement(s) with no mlChange field)`);
    }

    if (product.productType === "attar") {
      const currentRounded = Math.round(product.oilStockMl * 1000) / 1000;
      const sumRounded = Math.round(sum * 1000) / 1000;
      report(
        currentRounded === sumRounded,
        `${product.name} (${doc.id}): oilStockMl ${currentRounded}ml vs sum-of-movements ${sumRounded}ml (${movementsSnap.size} movements)`,
      );
    } else {
      report(
        product.unitStock === sum,
        `${product.name} (${doc.id}): unitStock ${product.unitStock} vs sum-of-movements ${sum} (${movementsSnap.size} movements)`,
      );
    }
  }

  console.log("\n== 2. Per-sale check: no duplicate sale-reason movements for the same draw ==\n");

  // Only sales from the last 30 days, to keep this fast — the reconciliation
  // above already covers a product's entire history; this pass adds the
  // duplicate-write check specifically for recent orders across every
  // channel (online/offline/COD all write via the same recordSale reasons).
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentSales = await salesCollection().where("createdAt", ">=", thirtyDaysAgo).get();
  console.log(`  Checking ${recentSales.size} sales from the last 30 days...`);

  let salesWithDuplicates = 0;
  for (const saleDoc of recentSales.docs) {
    const sale = saleDoc.data();
    const saleReason = sale.channel === "online" ? "online_sale" : "offline_sale";
    const movementsSnap = await stockMovementsCollection()
      .where("referenceId", "==", saleDoc.id)
      .where("reason", "==", saleReason)
      .get();

    // Count expected draws: one per direct product line's (productId,
    // variantId), one per combo component. A repeated (productId,variantId)
    // across multiple lines legitimately produces multiple movement docs
    // (each line writes its own), so this checks for a stricter invariant:
    // the number of movement docs matches the number of underlying draws
    // implied by the sale's own items, no more.
    let expectedDrawCount = 0;
    for (const item of sale.items) {
      if (item.comboComponents && item.comboComponents.length > 0) {
        expectedDrawCount += item.comboComponents.length;
      } else if (item.comboId) {
        // combo item with no comboComponents snapshot (shouldn't happen on
        // any sale created after comboComponents shipped) — skip, can't
        // determine expected draws without the snapshot.
        continue;
      } else {
        expectedDrawCount += 1;
      }
    }

    if (movementsSnap.size !== expectedDrawCount) {
      salesWithDuplicates++;
      console.log(
        `  MISMATCH: sale ${saleDoc.id} (${sale.invoiceNo}, ${sale.channel}): expected ${expectedDrawCount} stock movement(s), found ${movementsSnap.size}`,
      );
    }
  }
  report(salesWithDuplicates === 0, `all ${recentSales.size} recent sales have exactly the expected number of stock movements (0 mismatches)`);

  console.log(
    issues === 0
      ? "\nAll checks passed: every active product's current stock exactly equals the sum of its full movement history, and no recent sale has a duplicate or missing stock movement.\n"
      : `\n${issues} check(s) found a MISMATCH — see above.\n`,
  );
  process.exit(issues === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import {
  productsCollection,
  salesCollection,
  stockMovementsCollection,
} from "@/lib/firestore/admin-collections";
import { parseVariantType } from "@/lib/admin/salesAggregation";
import { defaultOilMlPerUnit } from "@/lib/pricing";
import type { ProductDoc, SaleItem } from "@/lib/firestore/types";

/**
 * One-time backfill: fills oilMlUsed (per item) and totalOilMlUsed (per
 * sale) on every existing sale that predates the bulk-oil model, so
 * historical reports aren't blank. For each item, in order of preference:
 *
 *   1. Its own stockMovement already stores ml (mlChange) — use it.
 *   2. Its own stockMovement stores units under the pre-bulk-oil field name
 *      (qtyChange) — convert using that variant's CURRENT oilMlPerUnit
 *      (we have no historical snapshot for these, so current is the best
 *      available truth).
 *   3. No movement found at all — qty * current oilMlPerUnit directly.
 *
 * Sales that already have oilMlUsed on every item and a totalOilMlUsed are
 * left untouched (idempotent — safe to re-run).
 */
async function main() {
  const salesSnap = await salesCollection().get();
  const productCache = new Map<string, ProductDoc | null>();

  async function getProduct(productId: string): Promise<ProductDoc | null> {
    if (productCache.has(productId)) return productCache.get(productId)!;
    const snap = await productsCollection().doc(productId).get();
    const data = snap.exists ? snap.data()! : null;
    productCache.set(productId, data);
    return data;
  }

  let skipped = 0;
  let patched = 0;
  let fromMlMovement = 0;
  let fromQtyMovement = 0;
  let fromNoMovement = 0;

  for (const doc of salesSnap.docs) {
    const sale = doc.data();
    const alreadyDone =
      typeof (sale as unknown as Record<string, unknown>).totalOilMlUsed ===
        "number" &&
      sale.items.every(
        (i) =>
          typeof (i as unknown as Record<string, unknown>).oilMlUsed ===
          "number",
      );
    if (alreadyDone) {
      skipped++;
      continue;
    }

    const movementsSnap = await stockMovementsCollection()
      .where("referenceId", "==", doc.id)
      .get();
    const movementsByVariant = new Map<string, Record<string, unknown>>();
    for (const m of movementsSnap.docs) {
      const data = m.data() as unknown as Record<string, unknown>;
      const key = `${data.productId}::${data.variantId}`;
      movementsByVariant.set(key, data);
    }

    const nextItems: SaleItem[] = [];
    for (const item of sale.items) {
      const legacyItem = item as unknown as Record<string, unknown>;
      if (typeof legacyItem.oilMlUsed === "number") {
        nextItems.push(item);
        continue;
      }

      const movement = movementsByVariant.get(
        `${item.productId}::${item.variantId}`,
      );

      let oilMlUsed: number;
      if (movement && typeof movement.mlChange === "number") {
        oilMlUsed = Math.abs(movement.mlChange);
        fromMlMovement++;
      } else {
        const product = await getProduct(item.productId);
        const variant = product?.variants.find(
          (v) => v.variantId === item.variantId,
        );
        const oilMlPerUnit =
          variant?.oilMlPerUnit ??
          defaultOilMlPerUnit(parseVariantType(item.variantId), item.sizeMl);

        if (movement && typeof movement.qtyChange === "number") {
          oilMlUsed = Math.abs(movement.qtyChange) * oilMlPerUnit;
          fromQtyMovement++;
        } else {
          oilMlUsed = item.qty * oilMlPerUnit;
          fromNoMovement++;
        }
      }

      nextItems.push({ ...item, oilMlUsed });
    }

    const totalOilMlUsed = nextItems.reduce(
      (sum, i) => sum + (i.oilMlUsed ?? 0),
      0,
    );

    await doc.ref.update({ items: nextItems, totalOilMlUsed });
    patched++;
    console.log(
      `  patched ${sale.invoiceNo} (${doc.id}): totalOilMlUsed=${totalOilMlUsed}`,
    );
  }

  console.log(
    `\nDone. ${patched} sale(s) patched, ${skipped} already had oilMlUsed.`,
  );
  console.log(
    `  items resolved from ml-shaped movement:  ${fromMlMovement}\n` +
      `  items resolved from qty-shaped movement: ${fromQtyMovement}\n` +
      `  items resolved with no movement found:   ${fromNoMovement}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

import { productsCollection } from "@/lib/firestore/admin-collections";
import { defaultOilMlPerUnit } from "@/lib/pricing";

/**
 * One-time migration from per-variant bottle counts to the bulk oil model:
 * every product gets ONE oilStockMl pool (starts at 0 — real counts are
 * entered via an admin stocktake) and a lowStockThresholdMl, and every
 * variant loses its own stock/lowStockThreshold in favor of oilMlPerUnit
 * (ml of oil one unit consumes, defaulted per type/size). Old stockMovements
 * documents are left untouched as historical record of the old model.
 */
async function main() {
  const snap = await productsCollection().get();
  let patched = 0;

  for (const doc of snap.docs) {
    const product = doc.data();

    const nextVariants = product.variants.map((v) => {
      const legacy = v as unknown as Record<string, unknown>;
      const oilMlPerUnit =
        typeof legacy.oilMlPerUnit === "number"
          ? legacy.oilMlPerUnit
          : defaultOilMlPerUnit(v.type, v.sizeMl);
      return {
        variantId: v.variantId,
        type: v.type,
        sizeMl: v.sizeMl,
        priceInr: v.priceInr,
        mrpInr: v.mrpInr,
        oilMlPerUnit,
        isActive: v.isActive,
      };
    });

    const legacyProduct = product as unknown as Record<string, unknown>;
    const alreadyMigrated =
      typeof legacyProduct.oilStockMl === "number" &&
      typeof legacyProduct.lowStockThresholdMl === "number" &&
      product.variants.every(
        (v) => typeof (v as unknown as Record<string, unknown>).oilMlPerUnit === "number",
      );
    if (alreadyMigrated) continue;

    await doc.ref.update({
      variants: nextVariants,
      oilStockMl: typeof legacyProduct.oilStockMl === "number" ? legacyProduct.oilStockMl : 0,
      lowStockThresholdMl:
        typeof legacyProduct.lowStockThresholdMl === "number"
          ? legacyProduct.lowStockThresholdMl
          : 10,
    });
    patched++;
    console.log(`  migrated ${product.name}`);
  }

  console.log(`\nDone. Migrated ${patched} of ${snap.size} products to the bulk oil model.`);
  console.log(
    "Every product's oilStockMl starts at 0 — enter real ml counts via Admin > Stock > Set exact stock.",
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

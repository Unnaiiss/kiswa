import { productsCollection } from "@/lib/firestore/admin-collections";

/**
 * One-time migration: `ProductVariant.isActive` was added after the catalog
 * was seeded, so every existing variant is missing the field — and
 * recordSale now rejects any variant where isActive isn't true. Backfill
 * isActive to match the parent product's isActive so existing stock stays
 * sellable exactly as it was before the field existed.
 */
async function main() {
  const snap = await productsCollection().get();
  let patched = 0;

  for (const doc of snap.docs) {
    const product = doc.data();
    const needsPatch = product.variants.some(
      (v) => (v as { isActive?: boolean }).isActive === undefined,
    );
    if (!needsPatch) continue;

    const variants = product.variants.map((v) => ({
      ...v,
      isActive: (v as { isActive?: boolean }).isActive ?? product.isActive,
    }));

    await doc.ref.update({ variants });
    patched++;
    console.log(`  patched ${product.name}`);
  }

  console.log(`\nDone. Patched ${patched} of ${snap.size} products.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

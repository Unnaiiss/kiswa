import { productsCollection } from "@/lib/firestore/admin-collections";

/**
 * One-time migration adding productType to every existing product doc.
 * Every product created before the "Imported Perfumes" feature is an attar
 * product — it already has variants/oilStockMl/lowStockThresholdMl, it just
 * needs the new productType: 'attar' discriminant field written on top.
 */
async function main() {
  const snap = await productsCollection().get();
  let patched = 0;

  for (const doc of snap.docs) {
    const product = doc.data();
    const legacy = product as unknown as Record<string, unknown>;
    if (typeof legacy.productType === "string") continue;

    await doc.ref.update({ productType: "attar" });
    patched++;
    console.log(`  migrated ${product.name}`);
  }

  console.log(`\nDone. Migrated ${patched} of ${snap.size} products to productType: 'attar'.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

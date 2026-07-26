import { FieldValue } from "firebase-admin/firestore";
import { buildCatalogProducts } from "@/lib/catalog";
import { productsCollection } from "@/lib/firestore/admin-collections";
import { stockIn } from "@/lib/server/stockIn";

async function main() {
  const products = buildCatalogProducts();
  const productsRef = productsCollection();

  console.log(`Seeding ${products.length} products...\n`);

  for (const product of products) {
    await productsRef.doc(product.slug).set({
      name: product.name,
      slug: product.slug,
      description: product.description,
      notes: product.notes,
      category: product.category,
      imageUrls: [],
      isActive: product.isActive,
      variants: product.variants,
      createdAt: FieldValue.serverTimestamp(),
    });
    console.log(
      `  [product] ${product.name} (${product.isActive ? "active" : "pending"})`,
    );

    if (product.isActive) {
      for (const variant of product.variants) {
        await stockIn({
          productId: product.slug,
          variantId: variant.variantId,
          qty: 10,
          reason: "opening_stock",
          note: "initial seed",
        });
      }
      console.log(`    -> opening stock (10 x 6 variants) recorded`);
    }
  }

  const activeCount = products.filter((p) => p.isActive).length;
  const pendingCount = products.length - activeCount;
  console.log(
    `\nDone. ${activeCount} active products seeded with opening stock, ${pendingCount} pending products created with zero stock/price.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

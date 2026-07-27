import { FieldValue } from "firebase-admin/firestore";
import { productsCollection } from "@/lib/firestore/admin-collections";
import { recordSale } from "@/lib/server/recordSale";

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error(
    "This script must run against the Firestore emulator. Use `npm run test:oversell`.",
  );
  process.exit(1);
}

const TEST_PRODUCT_ID = "test-oversell-product";

async function main() {
  const products = productsCollection();

  // ---- Arrange: a product with two variants, each with its own stock ----
  await products.doc(TEST_PRODUCT_ID).set({
    name: "Test Oversell Product",
    slug: TEST_PRODUCT_ID,
    description: "Ephemeral product used only by the oversell test.",
    notes: ["test"],
    category: "Fragrance",
    imageUrls: [],
    isActive: true,
    variants: [
      {
        variantId: "oil-3ml",
        type: "oil",
        sizeMl: 3,
        priceInr: 150,
        mrpInr: 190,
        stock: 1,
        lowStockThreshold: 3,
        isActive: true,
      },
      {
        variantId: "spray-50ml",
        type: "spray",
        sizeMl: 50,
        priceInr: 420,
        mrpInr: 530,
        stock: 5,
        lowStockThreshold: 3,
        isActive: true,
      },
    ],
    createdAt: FieldValue.serverTimestamp(),
  });

  let failures = 0;

  function check(condition: boolean, description: string) {
    if (condition) {
      console.log(`  PASS: ${description}`);
    } else {
      console.log(`  FAIL: ${description}`);
      failures++;
    }
  }

  // ---- 1. Selling the last unit of oil-3ml succeeds ----
  console.log("\n1. Sell the only oil-3ml unit in stock");
  const firstSale = await recordSale({
    channel: "offline",
    customerName: "Test Customer",
    customerPhone: "9999999999",
    items: [{ productId: TEST_PRODUCT_ID, variantId: "oil-3ml", qty: 1 }],
    discount: 0,
    paymentMethod: "cash",
    paymentStatus: "paid",
    razorpayOrderId: null,
    razorpayPaymentId: null,
    orderStatus: "paid",
    shippingAddress: null,
    createdByUid: "test-script",
  });
  check(!!firstSale.invoiceNo.startsWith("KSW-"), "first sale recorded with a KSW invoice number");

  // ---- 2. Selling oil-3ml again must be rejected (now out of stock) ----
  console.log("\n2. Attempt to oversell oil-3ml (now out of stock)");
  let oversoldRejected = false;
  try {
    await recordSale({
      channel: "offline",
      customerName: "Test Customer",
      customerPhone: "9999999999",
      items: [{ productId: TEST_PRODUCT_ID, variantId: "oil-3ml", qty: 1 }],
      discount: 0,
      paymentMethod: "cash",
      paymentStatus: "paid",
      razorpayOrderId: null,
      razorpayPaymentId: null,
      orderStatus: "paid",
      shippingAddress: null,
      createdByUid: "test-script",
    });
  } catch (err) {
    oversoldRejected = true;
    console.log(`    -> rejected as expected: ${(err as Error).message}`);
  }
  check(oversoldRejected, "second sale of oil-3ml was rejected (oversell prevented)");

  // ---- 3. The sibling variant (spray-50ml) must still be sellable ----
  console.log("\n3. Sell spray-50ml on the same product (independent stock)");
  const secondSale = await recordSale({
    channel: "offline",
    customerName: "Test Customer",
    customerPhone: "9999999999",
    items: [{ productId: TEST_PRODUCT_ID, variantId: "spray-50ml", qty: 2 }],
    discount: 0,
    paymentMethod: "cash",
    paymentStatus: "paid",
    razorpayOrderId: null,
    razorpayPaymentId: null,
    orderStatus: "paid",
    shippingAddress: null,
    createdByUid: "test-script",
  });
  check(!!secondSale.invoiceNo.startsWith("KSW-"), "spray-50ml sale succeeded while oil-3ml stays sold out");

  // ---- 4. Final stock must reflect exactly these movements ----
  const finalSnap = await products.doc(TEST_PRODUCT_ID).get();
  const finalProduct = finalSnap.data()!;
  const oil = finalProduct.variants.find((v) => v.variantId === "oil-3ml")!;
  const spray = finalProduct.variants.find(
    (v) => v.variantId === "spray-50ml",
  )!;
  check(oil.stock === 0, `oil-3ml stock is 0 (was ${oil.stock})`);
  check(spray.stock === 3, `spray-50ml stock is 3 (was ${spray.stock})`);

  // ---- cleanup ----
  await products.doc(TEST_PRODUCT_ID).delete();

  console.log(
    failures === 0
      ? "\nAll checks passed: overselling is rejected per-variant, sibling variants stay sellable.\n"
      : `\n${failures} check(s) FAILED.\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

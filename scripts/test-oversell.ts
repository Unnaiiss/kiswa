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

  // ---- Arrange: a product with 5ml of oil left, shared by two variants ----
  await products.doc(TEST_PRODUCT_ID).set({
    productType: "attar",
    name: "Test Oversell Product",
    slug: TEST_PRODUCT_ID,
    description: "Ephemeral product used only by the oversell test.",
    notes: ["test"],
    category: "Fragrance",
    imageUrls: [],
    isActive: true,
    oilStockMl: 5,
    lowStockThresholdMl: 10,
    variants: [
      {
        variantId: "oil-3ml",
        type: "oil",
        sizeMl: 3,
        priceInr: 150,
        mrpInr: 190,
        oilMlPerUnit: 3,
        isActive: true,
      },
      {
        variantId: "oil-12ml",
        type: "oil",
        sizeMl: 12,
        priceInr: 400,
        mrpInr: 500,
        oilMlPerUnit: 12,
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

  // ---- 1. Selling one Oil 3ml (3ml of the 5ml pool) succeeds ----
  console.log("\n1. Sell one Oil 3ml unit (uses 3ml of the 5ml pool)");
  const firstSale = await recordSale({
    channel: "offline",
    customerName: "Test Customer",
    customerPhone: "9999999999",
    items: [{ kind: "product", productId: TEST_PRODUCT_ID, variantId: "oil-3ml", qty: 1 }],
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

  // ---- 2. Only 2ml left — Oil 12ml (needs 12ml) must be rejected ----
  console.log("\n2. Attempt to sell Oil 12ml with only 2ml left in the pool");
  let oil12Rejected = false;
  try {
    await recordSale({
      channel: "offline",
      customerName: "Test Customer",
      customerPhone: "9999999999",
      items: [{ kind: "product", productId: TEST_PRODUCT_ID, variantId: "oil-12ml", qty: 1 }],
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
    oil12Rejected = true;
    console.log(`    -> rejected as expected: ${(err as Error).message}`);
  }
  check(oil12Rejected, "Oil 12ml sale was rejected (needs 12ml, only 2ml left)");

  // ---- 3. Only 2ml left — a second Oil 3ml (needs 3ml) must ALSO be
  // rejected, proving both variants share one oil pool (unlike the old
  // per-variant model, where a sibling variant would have its own stock). ----
  console.log("\n3. Attempt to sell a second Oil 3ml with only 2ml left in the pool");
  let secondOil3Rejected = false;
  try {
    await recordSale({
      channel: "offline",
      customerName: "Test Customer",
      customerPhone: "9999999999",
      items: [{ kind: "product", productId: TEST_PRODUCT_ID, variantId: "oil-3ml", qty: 1 }],
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
    secondOil3Rejected = true;
    console.log(`    -> rejected as expected: ${(err as Error).message}`);
  }
  check(
    secondOil3Rejected,
    "second Oil 3ml sale was rejected (needs 3ml, only 2ml left — shared pool, not per-variant)",
  );

  // ---- 4. Final oil stock must reflect exactly the one successful sale ----
  const finalSnap = await products.doc(TEST_PRODUCT_ID).get();
  const finalProduct = finalSnap.data()!;
  check(
    finalProduct.productType === "attar" && finalProduct.oilStockMl === 2,
    `oilStockMl is 2 (5 - 3 from the one successful sale, was ${
      finalProduct.productType === "attar" ? finalProduct.oilStockMl : "N/A"
    })`,
  );

  // ---- cleanup ----
  await products.doc(TEST_PRODUCT_ID).delete();

  console.log(
    failures === 0
      ? "\nAll checks passed: overselling the shared oil pool is rejected regardless of which variant is requested.\n"
      : `\n${failures} check(s) FAILED.\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

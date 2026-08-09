import { FieldValue } from "firebase-admin/firestore";
import {
  combosCollection,
  productsCollection,
  salesCollection,
  stockMovementsCollection,
} from "@/lib/firestore/admin-collections";
import { recordSale } from "@/lib/server/recordSale";
import { restockCancelledSale } from "@/lib/server/restockCancelledSale";
import { IMPORTED_VARIANT_ID } from "@/lib/products";

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error(
    "This script must run against the Firestore emulator. Use `npm run test:cancel-restock`.",
  );
  process.exit(1);
}

/**
 * Proves cancelling an order (app/api/admin/sales/[id]/status/route.ts,
 * via lib/server/restockCancelledSale.ts) restores exactly the oil ml /
 * units the original sale consumed — for a direct attar line, a direct
 * imported line, and a combo bundling one more of each — and that
 * cancelling twice is rejected rather than double-restocking.
 */

const ATTAR_ID = "test-cancel-attar";
const IMPORTED_ID = "test-cancel-imported";
const COMBO_ID = "test-cancel-combo";

let failures = 0;
function check(condition: boolean, description: string) {
  if (condition) {
    console.log(`  PASS: ${description}`);
  } else {
    console.log(`  FAIL: ${description}`);
    failures++;
  }
}

async function main() {
  const products = productsCollection();
  const combos = combosCollection();

  await products.doc(ATTAR_ID).set({
    productType: "attar",
    name: "Test Cancel Attar",
    slug: ATTAR_ID,
    description: "Ephemeral product used only by the cancel-restock test.",
    notes: ["test"],
    category: "Fragrance",
    imageUrls: [],
    isActive: true,
    oilStockMl: 30,
    lowStockThresholdMl: 10,
    variants: [
      { variantId: "oil-6ml", type: "oil", sizeMl: 6, priceInr: 250, mrpInr: 300, oilMlPerUnit: 6, isActive: true },
    ],
    createdAt: FieldValue.serverTimestamp(),
  });

  await products.doc(IMPORTED_ID).set({
    productType: "imported",
    name: "Test Cancel Imported",
    slug: IMPORTED_ID,
    description: "Ephemeral product used only by the cancel-restock test.",
    notes: [],
    category: "Imported",
    imageUrls: [],
    isActive: true,
    priceInr: 900,
    mrpInr: 1100,
    sizeLabel: "100ml EDP",
    brand: null,
    unitStock: 10,
    lowStockThresholdUnits: 2,
    featuredOnHome: false,
    featuredOrder: null,
    createdAt: FieldValue.serverTimestamp(),
  });

  await combos.doc(COMBO_ID).set({
    title: "Test Cancel Combo",
    slug: COMBO_ID,
    description: "Ephemeral combo used only by the cancel-restock test.",
    imageUrl: null,
    imageUrlMobile: null,
    comboPriceInr: 999,
    originalPriceInr: 1150,
    type: "fixed",
    items: [
      { productId: ATTAR_ID, variantId: "oil-6ml", productName: "Test Cancel Attar", variantLabel: "Oil 6ml", qty: 1 },
      { productId: IMPORTED_ID, variantId: IMPORTED_VARIANT_ID, productName: "Test Cancel Imported", variantLabel: "100ml EDP", qty: 1 },
    ],
    chooseCount: null,
    eligibleVariants: [],
    isActive: true,
    order: 0,
    validFrom: null,
    validUntil: null,
    badgeText: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log("\n1. Record a mixed online sale (direct attar + direct imported + combo of both)");
  const { saleId } = await recordSale({
    channel: "online",
    customerName: "Test Cancel Customer",
    customerPhone: "9876511111",
    items: [
      { kind: "product", productId: ATTAR_ID, variantId: "oil-6ml", qty: 1 },
      { kind: "product", productId: IMPORTED_ID, variantId: IMPORTED_VARIANT_ID, qty: 1 },
      { kind: "combo", comboId: COMBO_ID, qty: 1, selections: [] },
    ],
    discount: 0,
    paymentMethod: "upi",
    paymentStatus: "paid",
    razorpayOrderId: null,
    razorpayPaymentId: null,
    orderStatus: "paid",
    shippingAddress: null,
    createdByUid: "test-script",
  });

  const attarAfterSale = (await products.doc(ATTAR_ID).get()).data()!;
  const importedAfterSale = (await products.doc(IMPORTED_ID).get()).data()!;
  check(
    attarAfterSale.productType === "attar" && attarAfterSale.oilStockMl === 18,
    `attar oilStockMl is 18 after the sale (30 - 6 direct - 6 via combo, was ${attarAfterSale.productType === "attar" ? attarAfterSale.oilStockMl : "N/A"})`,
  );
  check(
    importedAfterSale.productType === "imported" && importedAfterSale.unitStock === 8,
    `imported unitStock is 8 after the sale (10 - 1 direct - 1 via combo, was ${importedAfterSale.productType === "imported" ? importedAfterSale.unitStock : "N/A"})`,
  );

  console.log("\n2. Cancel the order");
  await restockCancelledSale(saleId);

  const attarAfterCancel = (await products.doc(ATTAR_ID).get()).data()!;
  const importedAfterCancel = (await products.doc(IMPORTED_ID).get()).data()!;
  check(
    attarAfterCancel.productType === "attar" && attarAfterCancel.oilStockMl === 30,
    `attar oilStockMl restored to 30 (was ${attarAfterCancel.productType === "attar" ? attarAfterCancel.oilStockMl : "N/A"})`,
  );
  check(
    importedAfterCancel.productType === "imported" && importedAfterCancel.unitStock === 10,
    `imported unitStock restored to 10 (was ${importedAfterCancel.productType === "imported" ? importedAfterCancel.unitStock : "N/A"})`,
  );

  const saleAfterCancel = (await salesCollection().doc(saleId).get()).data()!;
  check(saleAfterCancel.orderStatus === "cancelled", "sale's orderStatus flipped to cancelled");

  const returnMovements = await stockMovementsCollection()
    .where("referenceId", "==", saleId)
    .where("reason", "==", "return")
    .get();
  check(
    returnMovements.size === 4,
    `4 "return" stock movements written (2 direct + 2 combo components, got ${returnMovements.size})`,
  );

  console.log("\n3. Cancelling an already-cancelled order is rejected, not double-restocked");
  let secondCancelRejected = false;
  try {
    await restockCancelledSale(saleId);
  } catch (err) {
    secondCancelRejected = true;
    console.log(`    -> rejected as expected: ${(err as Error).message}`);
  }
  check(secondCancelRejected, "second cancel attempt was rejected");

  const attarAfterSecondAttempt = (await products.doc(ATTAR_ID).get()).data()!;
  check(
    attarAfterSecondAttempt.productType === "attar" && attarAfterSecondAttempt.oilStockMl === 30,
    `attar oilStockMl still exactly 30, not double-restocked (was ${attarAfterSecondAttempt.productType === "attar" ? attarAfterSecondAttempt.oilStockMl : "N/A"})`,
  );

  // ---- cleanup ----
  await products.doc(ATTAR_ID).delete();
  await products.doc(IMPORTED_ID).delete();
  await combos.doc(COMBO_ID).delete();

  console.log(
    failures === 0
      ? "\nAll checks passed: cancelling an order restores exactly the stock it consumed (direct + combo lines), atomically with the status flip, and cannot double-restock.\n"
      : `\n${failures} check(s) FAILED.\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

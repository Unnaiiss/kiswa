import { FieldValue } from "firebase-admin/firestore";
import {
  productsCollection,
  pendingOrdersCollection,
  refundFlagsCollection,
  salesCollection,
} from "@/lib/firestore/admin-collections";
import { recordSale } from "@/lib/server/recordSale";
import { finalizeOnlineOrder } from "@/lib/server/finalizeOnlineOrder";

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error(
    "This script must run against the Firestore emulator. Use `npm run test:checkout`.",
  );
  process.exit(1);
}

const TEST_PRODUCT_ID = "test-checkout-product";

const SHIPPING_ADDRESS = {
  line1: "221B Test Street",
  line2: null,
  city: "Mumbai",
  state: "Maharashtra",
  pincode: "400001",
  country: "India",
};

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

  // Only 3ml in the shared pool — exactly enough for the pending order's
  // oil-3ml unit, and nothing else.
  await products.doc(TEST_PRODUCT_ID).set({
    productType: "attar",
    name: "Test Checkout Product",
    slug: TEST_PRODUCT_ID,
    description: "Ephemeral product used only by the checkout test.",
    notes: ["test"],
    category: "Fragrance",
    imageUrls: [],
    isActive: true,
    oilStockMl: 3,
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
        variantId: "spray-50ml",
        type: "spray",
        sizeMl: 50,
        priceInr: 420,
        mrpInr: 530,
        oilMlPerUnit: 6,
        isActive: true,
      },
    ],
    createdAt: FieldValue.serverTimestamp(),
  });

  // ---- Scenario 1: the shared oil pool sells out between order creation and payment capture ----
  console.log(
    "\n1. Online order created for the only oil-3ml unit the pool can make, then a POS sale takes that same oil before payment is captured",
  );
  const conflictOrderId = "test_rzp_order_conflict";
  await pendingOrdersCollection().doc(conflictOrderId).set({
    items: [{ kind: "product", productId: TEST_PRODUCT_ID, variantId: "oil-3ml", qty: 1 }],
    customerName: "Priya Sharma",
    customerPhone: "9876543210",
    shippingAddress: SHIPPING_ADDRESS,
    amountPaise: 15000,
    status: "created",
    saleId: null,
    invoiceNo: null,
    createdAt: FieldValue.serverTimestamp(),
  });

  // A POS sale drains the shared pool while the online payment is in flight.
  await recordSale({
    channel: "offline",
    customerName: "Walk-in Customer",
    customerPhone: "9999999999",
    items: [{ kind: "product", productId: TEST_PRODUCT_ID, variantId: "oil-3ml", qty: 1 }],
    discount: 0,
    paymentMethod: "cash",
    paymentStatus: "paid",
    razorpayOrderId: null,
    razorpayPaymentId: null,
    orderStatus: "pending",
    shippingAddress: null,
    createdByUid: "test-script",
  });

  const conflictResult = await finalizeOnlineOrder(
    conflictOrderId,
    "test_rzp_payment_conflict",
  );
  check(
    conflictResult.status === "refund_flagged",
    `payment for the sold-out oil is flagged for refund, not recorded as a sale (got status: ${conflictResult.status})`,
  );

  const conflictPending = (
    await pendingOrdersCollection().doc(conflictOrderId).get()
  ).data();
  check(
    conflictPending?.status === "refund_flagged",
    "pendingOrder status updated to refund_flagged",
  );

  const refundFlagSnap = await refundFlagsCollection()
    .where("razorpayOrderId", "==", conflictOrderId)
    .get();
  check(
    refundFlagSnap.size === 1,
    "exactly one refundFlags doc was written for the conflicted order",
  );

  const productAfterConflict = (
    await products.doc(TEST_PRODUCT_ID).get()
  ).data()!;
  check(
    productAfterConflict.productType === "attar" && productAfterConflict.oilStockMl === 0,
    `oilStockMl stayed at 0, not decremented a second time (was ${
      productAfterConflict.productType === "attar" ? productAfterConflict.oilStockMl : "N/A"
    })`,
  );

  const onlineSalesForConflict = await salesCollection()
    .where("razorpayOrderId", "==", conflictOrderId)
    .get();
  check(
    onlineSalesForConflict.empty,
    "no sale document was created for the conflicted online payment",
  );

  // ---- Scenario 2: happy path — a new delivery tops up the pool, payment finalizes normally ----
  console.log(
    "\n2. New stock arrives (12ml); an online order for 2x spray-50ml (12ml) with stock available succeeds",
  );
  await products.doc(TEST_PRODUCT_ID).update({ oilStockMl: 12 });

  const okOrderId = "test_rzp_order_ok";
  await pendingOrdersCollection().doc(okOrderId).set({
    items: [{ kind: "product", productId: TEST_PRODUCT_ID, variantId: "spray-50ml", qty: 2 }],
    customerName: "Priya Sharma",
    customerPhone: "9876543210",
    shippingAddress: SHIPPING_ADDRESS,
    amountPaise: 84000,
    status: "created",
    saleId: null,
    invoiceNo: null,
    createdAt: FieldValue.serverTimestamp(),
  });

  const okResult = await finalizeOnlineOrder(okOrderId, "test_rzp_payment_ok");
  check(
    okResult.status === "completed" && okResult.invoiceNo.startsWith("KSW-"),
    `online payment recorded as a sale with a KSW invoice number (got status: ${okResult.status})`,
  );

  // ---- Scenario 3: finalizing the same completed order twice must not double-sell ----
  console.log(
    "\n3. Re-finalizing the same order (e.g. webhook racing the redirect handler) is idempotent",
  );
  const repeatResult = await finalizeOnlineOrder(
    okOrderId,
    "test_rzp_payment_ok",
  );
  check(
    repeatResult.status === "already_completed",
    `second finalize call recognizes the order is already completed (got status: ${repeatResult.status})`,
  );

  const productAfterOk = (await products.doc(TEST_PRODUCT_ID).get()).data()!;
  check(
    productAfterOk.productType === "attar" && productAfterOk.oilStockMl === 0,
    `oilStockMl decremented exactly once (12 - 12 = 0, was ${
      productAfterOk.productType === "attar" ? productAfterOk.oilStockMl : "N/A"
    })`,
  );

  const onlineSalesForOk = await salesCollection()
    .where("razorpayOrderId", "==", okOrderId)
    .get();
  check(
    onlineSalesForOk.size === 1,
    "exactly one sale document exists for the order even after finalizing twice",
  );

  // ---- cleanup ----
  await products.doc(TEST_PRODUCT_ID).delete();

  console.log(
    failures === 0
      ? "\nAll checks passed: a payment for oil that just sold out is rejected by recordSale's stock re-check and flagged for refund instead of overselling.\n"
      : `\n${failures} check(s) FAILED.\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

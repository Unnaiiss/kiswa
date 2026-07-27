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

  await products.doc(TEST_PRODUCT_ID).set({
    name: "Test Checkout Product",
    slug: TEST_PRODUCT_ID,
    description: "Ephemeral product used only by the checkout test.",
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

  // ---- Scenario 1: a variant sells out between order creation and payment capture ----
  console.log(
    "\n1. Online order created for the last oil-3ml unit, then it sells out via POS before payment is captured",
  );
  const conflictOrderId = "test_rzp_order_conflict";
  await pendingOrdersCollection().doc(conflictOrderId).set({
    items: [{ productId: TEST_PRODUCT_ID, variantId: "oil-3ml", qty: 1 }],
    customerName: "Priya Sharma",
    customerPhone: "9876543210",
    shippingAddress: SHIPPING_ADDRESS,
    amountPaise: 15000,
    status: "created",
    saleId: null,
    invoiceNo: null,
    createdAt: FieldValue.serverTimestamp(),
  });

  // A POS sale takes the last unit while the online payment is in flight.
  await recordSale({
    channel: "offline",
    customerName: "Walk-in Customer",
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

  const conflictResult = await finalizeOnlineOrder(
    conflictOrderId,
    "test_rzp_payment_conflict",
  );
  check(
    conflictResult.status === "refund_flagged",
    `payment for the sold-out variant is flagged for refund, not recorded as a sale (got status: ${conflictResult.status})`,
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
  const oilAfterConflict = productAfterConflict.variants.find(
    (v) => v.variantId === "oil-3ml",
  )!;
  check(
    oilAfterConflict.stock === 0,
    `oil-3ml stock stayed at 0, not decremented a second time (was ${oilAfterConflict.stock})`,
  );

  const onlineSalesForConflict = await salesCollection()
    .where("razorpayOrderId", "==", conflictOrderId)
    .get();
  check(
    onlineSalesForConflict.empty,
    "no sale document was created for the conflicted online payment",
  );

  // ---- Scenario 2: happy path — stock is available, payment finalizes normally ----
  console.log("\n2. Online order for spray-50ml with stock available succeeds");
  const okOrderId = "test_rzp_order_ok";
  await pendingOrdersCollection().doc(okOrderId).set({
    items: [{ productId: TEST_PRODUCT_ID, variantId: "spray-50ml", qty: 2 }],
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
  const sprayAfterOk = productAfterOk.variants.find(
    (v) => v.variantId === "spray-50ml",
  )!;
  check(
    sprayAfterOk.stock === 3,
    `spray-50ml stock decremented exactly once (5 - 2 = 3, was ${sprayAfterOk.stock})`,
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
      ? "\nAll checks passed: a payment for a variant that just sold out is rejected by recordSale's stock re-check and flagged for refund instead of overselling.\n"
      : `\n${failures} check(s) FAILED.\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

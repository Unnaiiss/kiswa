import crypto from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import {
  paymentAttemptsCollection,
  pendingOrdersCollection,
  productsCollection,
  salesCollection,
} from "@/lib/firestore/admin-collections";
import { recordSale } from "@/lib/server/recordSale";
import { finalizeOnlineOrder } from "@/lib/server/finalizeOnlineOrder";
import { recordRefund } from "@/lib/server/refundSale";

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error(
    "This script must run against the Firestore emulator. Use `npm run test:online-payments`.",
  );
  process.exit(1);
}

// Fake TEST-mode secrets — read lazily inside lib/server/razorpay.ts's
// functions, so setting them here (before or after import) is fine. Proves
// the HMAC verification logic itself is correct without hitting Razorpay's
// real API or needing the real .env.local secrets.
process.env.RAZORPAY_KEY_ID = "rzp_test_fake";
process.env.RAZORPAY_KEY_SECRET = "test_key_secret_123";
process.env.RAZORPAY_WEBHOOK_SECRET = "test_webhook_secret_456";
// Imported after the env vars above are set, since razorpay.ts reads them
// lazily inside each function call anyway — order doesn't actually matter,
// but this keeps intent obvious.
import { verifyPaymentSignature, verifyWebhookSignature } from "@/lib/server/razorpay";

const ATTAR_ID = "test-pay-attar";
const CUSTOMER_UID = "test-pay-customer-uid";
const ADMIN_UID = "test-pay-admin-uid";

const DELIVERY_ADDRESS = {
  label: "Home",
  fullName: "Priya Sharma",
  phone: "9876543210",
  line1: "221B Test Street",
  line2: null,
  city: "Mumbai",
  district: "Mumbai",
  state: "Maharashtra",
  pincode: "400001",
  landmark: null,
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

async function oilStockMl(): Promise<number> {
  const snap = await productsCollection().doc(ATTAR_ID).get();
  const data = snap.data();
  return data && data.productType === "attar" ? data.oilStockMl : -1;
}

/** Mirrors app/api/checkout/payment-failed/route.ts's + the webhook's
 * payment.failed branch — both write a paymentAttempts doc and, ONLY if the
 * pendingOrder is still created/processing, flip it to 'failed'. Kept as a
 * standalone function here (rather than re-implementing the route over
 * HTTP) so the exact idempotency contract — never overwriting an already-
 * completed order — is provable directly against Firestore. */
async function simulatePaymentFailed(orderId: string, paymentId: string, reason: string) {
  await paymentAttemptsCollection().doc(paymentId).set({
    razorpayOrderId: orderId,
    razorpayPaymentId: paymentId,
    status: "failed",
    reason,
    createdAt: FieldValue.serverTimestamp(),
  });
  const pendingRef = pendingOrdersCollection().doc(orderId);
  const snap = await pendingRef.get();
  const data = snap.data();
  if (data && (data.status === "created" || data.status === "processing")) {
    await pendingRef.update({ status: "failed" });
  }
}

/** Mirrors app/api/admin/sales/[id]/mark-paid/route.ts's guard logic exactly
 * (only from paymentMethod 'cod' + paymentStatus 'pending', 409 otherwise). */
async function simulateMarkPaid(saleId: string): Promise<{ ok: boolean; error?: string }> {
  const ref = salesCollection().doc(saleId);
  const snap = await ref.get();
  const sale = snap.data();
  if (!snap.exists || !sale) return { ok: false, error: "not_found" };
  if (sale.paymentMethod !== "cod") return { ok: false, error: "wrong_method" };
  if (sale.paymentStatus !== "pending") return { ok: false, error: "wrong_status" };
  await ref.update({ paymentStatus: "paid" });
  return { ok: true };
}

async function main() {
  const products = productsCollection();

  await products.doc(ATTAR_ID).set({
    productType: "attar",
    name: "Test Payments Attar",
    slug: ATTAR_ID,
    description: "Ephemeral product used only by the online-payments test.",
    notes: ["test"],
    category: "Fragrance",
    imageUrls: [],
    isActive: true,
    oilStockMl: 60,
    lowStockThresholdMl: 10,
    variants: [
      { variantId: "oil-6ml", type: "oil", sizeMl: 6, priceInr: 300, mrpInr: 350, oilMlPerUnit: 6, isActive: true },
    ],
    createdAt: FieldValue.serverTimestamp(),
  });

  // ============================================================
  console.log("\n== A. Signature verification (HMAC correctness) ==");
  const goodPaymentSig = crypto
    .createHmac("sha256", "test_key_secret_123")
    .update("order_sig_test|pay_sig_test")
    .digest("hex");
  check(
    verifyPaymentSignature("order_sig_test", "pay_sig_test", goodPaymentSig) === true,
    "a correctly-signed order_id|payment_id passes verifyPaymentSignature",
  );
  check(
    verifyPaymentSignature("order_sig_test", "pay_sig_test", "0".repeat(64)) === false,
    "a wrong signature is rejected by verifyPaymentSignature",
  );

  const rawBody = JSON.stringify({ event: "payment.captured", payload: {} });
  const goodWebhookSig = crypto
    .createHmac("sha256", "test_webhook_secret_456")
    .update(rawBody)
    .digest("hex");
  check(
    verifyWebhookSignature(rawBody, goodWebhookSig) === true,
    "a correctly-signed webhook body passes verifyWebhookSignature",
  );
  check(
    verifyWebhookSignature(rawBody, "0".repeat(64)) === false,
    "a wrong webhook signature is rejected by verifyWebhookSignature",
  );

  // ============================================================
  console.log("\n== B. Success + duplicate webhook idempotency ==");
  const successOrderId = "test_pay_order_success";
  const successPaymentId = "test_pay_payment_success";
  await pendingOrdersCollection().doc(successOrderId).set({
    items: [{ kind: "product", productId: ATTAR_ID, variantId: "oil-6ml", qty: 2 }],
    customerName: DELIVERY_ADDRESS.fullName,
    customerPhone: DELIVERY_ADDRESS.phone,
    shippingAddress: null,
    amountPaise: 60000,
    status: "created",
    saleId: null,
    invoiceNo: null,
    createdAt: FieldValue.serverTimestamp(),
    giftShippingAddress: null,
    hidePrices: false,
    customerUid: CUSTOMER_UID,
    deliveryAddress: DELIVERY_ADDRESS,
    source: "razorpay",
    referenceCode: null,
    expiresAt: null,
  });

  const before = await oilStockMl();
  const result1 = await finalizeOnlineOrder(successOrderId, successPaymentId);
  check(
    result1.status === "completed" && !!result1.invoiceNo?.startsWith("KSW-"),
    `first finalize call records the sale (got status: ${result1.status})`,
  );
  const afterFirst = await oilStockMl();
  check(afterFirst === before - 12, `oil stock decremented by exactly 12ml (60 -> ${afterFirst})`);

  const saleSnap1 = result1.status === "completed"
    ? await salesCollection().doc(result1.saleId).get()
    : null;
  const sale1 = saleSnap1?.data();
  check(
    sale1?.customerUid === CUSTOMER_UID && sale1?.deliveryAddress?.pincode === DELIVERY_ADDRESS.pincode,
    "the sale carries the customerUid and delivery address from the pendingOrder",
  );
  check(
    sale1?.paymentMethod === "razorpay" && sale1?.paymentStatus === "paid",
    "the sale is paymentMethod razorpay / paymentStatus paid",
  );

  const attemptSnap1 = await paymentAttemptsCollection().doc(successPaymentId).get();
  const attempt1 = attemptSnap1.data();
  check(
    attemptSnap1.exists && attempt1?.status === "captured" && attempt1?.razorpayOrderId === successOrderId,
    "a paymentAttempts doc (id = payment id) was written with status 'captured'",
  );

  console.log("  -- simulating a duplicate webhook delivery for the SAME payment --");
  const result2 = await finalizeOnlineOrder(successOrderId, successPaymentId);
  check(
    result2.status === "already_completed",
    `second finalize call (duplicate webhook) is a no-op (got status: ${result2.status})`,
  );
  const afterSecond = await oilStockMl();
  check(afterSecond === afterFirst, `oil stock unchanged after the duplicate call (still ${afterSecond})`);
  const dupSales = await salesCollection().where("razorpayOrderId", "==", successOrderId).get();
  check(dupSales.size === 1, `exactly one sale document exists despite finalizing twice (got ${dupSales.size})`);

  // ============================================================
  console.log("\n== C. Failed payment ==");
  const failOrderId = "test_pay_order_fail";
  const failPaymentId = "test_pay_payment_fail";
  await pendingOrdersCollection().doc(failOrderId).set({
    items: [{ kind: "product", productId: ATTAR_ID, variantId: "oil-6ml", qty: 1 }],
    customerName: DELIVERY_ADDRESS.fullName,
    customerPhone: DELIVERY_ADDRESS.phone,
    shippingAddress: null,
    amountPaise: 30000,
    status: "created",
    saleId: null,
    invoiceNo: null,
    createdAt: FieldValue.serverTimestamp(),
    giftShippingAddress: null,
    hidePrices: false,
    customerUid: CUSTOMER_UID,
    deliveryAddress: DELIVERY_ADDRESS,
    source: "razorpay",
    referenceCode: null,
    expiresAt: null,
  });

  const beforeFail = await oilStockMl();
  await simulatePaymentFailed(failOrderId, failPaymentId, "Card declined by issuing bank");
  const failPending = (await pendingOrdersCollection().doc(failOrderId).get()).data();
  check(failPending?.status === "failed", "pendingOrder flips to 'failed' status");
  const failAttempt = (await paymentAttemptsCollection().doc(failPaymentId).get()).data();
  check(
    failAttempt?.status === "failed" && failAttempt?.reason === "Card declined by issuing bank",
    "a paymentAttempts doc was written with status 'failed' and the reason",
  );
  const afterFail = await oilStockMl();
  check(afterFail === beforeFail, `oil stock untouched by a failed payment (still ${afterFail})`);
  const failSales = await salesCollection().where("razorpayOrderId", "==", failOrderId).get();
  check(failSales.empty, "no sale document was created for the failed payment");

  console.log("  -- a late/duplicate failed-webhook for an order that separately succeeded must not un-complete it --");
  await simulatePaymentFailed(successOrderId, "test_pay_payment_late_failed_dup", "Late duplicate");
  const successPendingAfter = (await pendingOrdersCollection().doc(successOrderId).get()).data();
  check(
    successPendingAfter?.status === "completed",
    `the already-completed order's status is untouched by a late failed-webhook (still ${successPendingAfter?.status})`,
  );

  // ============================================================
  console.log("\n== D. Cancellation / abandonment (customer closes the modal) ==");
  const abandonedOrderId = "test_pay_order_abandoned";
  await pendingOrdersCollection().doc(abandonedOrderId).set({
    items: [{ kind: "product", productId: ATTAR_ID, variantId: "oil-6ml", qty: 1 }],
    customerName: DELIVERY_ADDRESS.fullName,
    customerPhone: DELIVERY_ADDRESS.phone,
    shippingAddress: null,
    amountPaise: 30000,
    status: "created",
    saleId: null,
    invoiceNo: null,
    createdAt: FieldValue.serverTimestamp(),
    giftShippingAddress: null,
    hidePrices: false,
    customerUid: CUSTOMER_UID,
    deliveryAddress: DELIVERY_ADDRESS,
    source: "razorpay",
    referenceCode: null,
    expiresAt: null,
  });
  const beforeAbandon = await oilStockMl();
  // Nothing ever calls verify or payment-failed for this order — Checkout.js's
  // modal.ondismiss never hits the network. This IS the test: prove that
  // "doing nothing" leaves everything untouched, by construction.
  const afterAbandon = await oilStockMl();
  check(afterAbandon === beforeAbandon, "an abandoned checkout leaves stock completely untouched");
  const abandonedPending = (await pendingOrdersCollection().doc(abandonedOrderId).get()).data();
  check(abandonedPending?.status === "created", "the pendingOrder is simply left in 'created' status forever");
  const abandonedSales = await salesCollection().where("razorpayOrderId", "==", abandonedOrderId).get();
  check(abandonedSales.empty, "no sale document was ever created for the abandoned checkout");

  // ============================================================
  console.log("\n== E. Cash on Delivery ==");
  const beforeCod = await oilStockMl();
  const codResult = await recordSale({
    channel: "online",
    customerName: DELIVERY_ADDRESS.fullName,
    customerPhone: DELIVERY_ADDRESS.phone,
    items: [{ kind: "product", productId: ATTAR_ID, variantId: "oil-6ml", qty: 1 }],
    discount: 0,
    paymentMethod: "cod",
    paymentStatus: "pending",
    razorpayOrderId: null,
    razorpayPaymentId: null,
    orderStatus: "pending",
    shippingAddress: null,
    createdByUid: "online-checkout",
    createdByName: "System (Cash on Delivery order placed)",
    customerUid: CUSTOMER_UID,
    deliveryAddress: DELIVERY_ADDRESS,
  });
  const afterCod = await oilStockMl();
  check(afterCod === beforeCod - 6, `COD decrements stock immediately, not deferred (${beforeCod} -> ${afterCod})`);
  const codSale = (await salesCollection().doc(codResult.saleId).get()).data();
  check(
    codSale?.paymentMethod === "cod" && codSale?.paymentStatus === "pending" && codSale?.orderStatus === "pending",
    "the COD sale is recorded with paymentStatus 'pending' despite stock already being committed",
  );

  console.log("  -- admin 'mark as paid' action --");
  const markPaid1 = await simulateMarkPaid(codResult.saleId);
  check(markPaid1.ok, "marking a pending COD order as paid succeeds");
  const codSaleAfterPaid = (await salesCollection().doc(codResult.saleId).get()).data();
  check(codSaleAfterPaid?.paymentStatus === "paid", "paymentStatus flipped to 'paid'");

  const markPaid2 = await simulateMarkPaid(codResult.saleId);
  check(
    !markPaid2.ok && markPaid2.error === "wrong_status",
    "marking an already-paid COD order as paid again is rejected (can't double-mark)",
  );

  const markPaidOnRazorpay = await simulateMarkPaid(result1.status === "completed" ? result1.saleId : "");
  check(
    !markPaidOnRazorpay.ok && markPaidOnRazorpay.error === "wrong_method",
    "mark-as-paid is rejected on a non-COD (razorpay) sale",
  );

  // ============================================================
  console.log("\n== F. Refunds ==");

  console.log("  -- F1: refund WITHOUT restock (goodwill refund, stock/status untouched) --");
  const beforeF1 = await oilStockMl();
  await recordRefund({
    saleId: codResult.saleId,
    status: "completed",
    amountInr: 300,
    reason: "Customer requested a partial refund",
    restock: false,
    actingUid: ADMIN_UID,
    actingName: "Test Admin",
  });
  const codSaleAfterRefund = (await salesCollection().doc(codResult.saleId).get()).data();
  check(
    codSaleAfterRefund?.refund?.amountInr === 300 && codSaleAfterRefund?.paymentStatus === "refunded",
    "sale.refund is recorded and paymentStatus flips to 'refunded'",
  );
  check(
    codSaleAfterRefund?.orderStatus === "pending",
    "orderStatus is untouched when restock is not requested",
  );
  const afterF1 = await oilStockMl();
  check(afterF1 === beforeF1, "stock is untouched when restock is not requested");

  console.log("  -- F2: refund WITH restock on a 'pending' order -> target status 'cancelled' --");
  const beforeF2 = await oilStockMl();
  const razorpaySaleId = result1.status === "completed" ? result1.saleId : "";
  await recordRefund({
    saleId: razorpaySaleId,
    status: "completed",
    amountInr: 600,
    reason: "Item out of stock, refunding in full",
    restock: true,
    actingUid: ADMIN_UID,
    actingName: "Test Admin",
  });
  const afterF2 = await oilStockMl();
  check(afterF2 === beforeF2 + 12, `restock restores exactly the 12ml this sale consumed (${beforeF2} -> ${afterF2})`);
  const razorpaySaleAfterRefund = (await salesCollection().doc(razorpaySaleId).get()).data();
  check(
    razorpaySaleAfterRefund?.orderStatus === "cancelled",
    `a 'pending' order refunded-with-restock becomes 'cancelled' (got ${razorpaySaleAfterRefund?.orderStatus})`,
  );
  check(
    (razorpaySaleAfterRefund?.statusHistory?.length ?? 0) === 2 &&
      (razorpaySaleAfterRefund?.statusHistory?.[1]?.note?.includes("Refund recorded") ?? false),
    "statusHistory gained a 'Refund recorded' entry",
  );

  console.log("  -- F3: a second restock-refund on the now-terminal order is rejected (no double-restock) --");
  let secondRestockRejected = false;
  try {
    await recordRefund({
      saleId: razorpaySaleId,
      status: "completed",
      amountInr: 600,
      reason: "Trying to restock again",
      restock: true,
      actingUid: ADMIN_UID,
      actingName: "Test Admin",
    });
  } catch (err) {
    secondRestockRejected = true;
    console.log(`    -> rejected as expected: ${(err as Error).message}`);
  }
  check(secondRestockRejected, "restocking an already-cancelled/returned order is rejected");
  const afterF3 = await oilStockMl();
  check(afterF3 === afterF2, `stock is NOT double-restored (still ${afterF3})`);

  console.log("  -- refund WITHOUT restock is still allowed on a terminal order --");
  await recordRefund({
    saleId: razorpaySaleId,
    status: "completed",
    amountInr: 600,
    reason: "Recording the refund without restocking again",
    restock: false,
    actingUid: ADMIN_UID,
    actingName: "Test Admin",
  });
  const razorpaySaleAfterSecondRefund = (await salesCollection().doc(razorpaySaleId).get()).data();
  check(
    razorpaySaleAfterSecondRefund?.refund?.reason === "Recording the refund without restocking again",
    "a non-restocking refund on a terminal order still succeeds and overwrites the refund record",
  );

  console.log("  -- F4: refund WITH restock on a 'delivered' order -> target status 'returned' --");
  const posSale = await recordSale({
    channel: "offline",
    customerName: "Walk-in Customer",
    customerPhone: "9999999999",
    items: [{ kind: "product", productId: ATTAR_ID, variantId: "oil-6ml", qty: 1 }],
    discount: 0,
    paymentMethod: "cash",
    paymentStatus: "paid",
    razorpayOrderId: null,
    razorpayPaymentId: null,
    orderStatus: "delivered",
    shippingAddress: null,
    createdByUid: "test-script",
  });
  const beforeF4 = await oilStockMl();
  await recordRefund({
    saleId: posSale.saleId,
    status: "completed",
    amountInr: 300,
    reason: "Customer returned the item",
    restock: true,
    actingUid: ADMIN_UID,
    actingName: "Test Admin",
  });
  const afterF4 = await oilStockMl();
  check(afterF4 === beforeF4 + 6, `restock restores the 6ml this POS sale consumed (${beforeF4} -> ${afterF4})`);
  const posSaleAfterRefund = (await salesCollection().doc(posSale.saleId).get()).data();
  check(
    posSaleAfterRefund?.orderStatus === "returned",
    `a 'delivered' order refunded-with-restock becomes 'returned', not 'cancelled' (got ${posSaleAfterRefund?.orderStatus})`,
  );

  // ---- cleanup ----
  await products.doc(ATTAR_ID).delete();

  console.log(
    failures === 0
      ? "\nAll checks passed: Razorpay success/failure/duplicate-webhook idempotency, COD, and refund (with/without restock, and terminal-order double-restock rejection) all behave correctly.\n"
      : `\n${failures} check(s) FAILED.\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { FieldValue } from "firebase-admin/firestore";
import {
  customersCollection,
  productsCollection,
  salesCollection,
} from "@/lib/firestore/admin-collections";
import { recordSale } from "@/lib/server/recordSale";
import { updateOrderStatus } from "@/lib/server/orderFulfillment";
import { getOrderByToken } from "@/lib/server/customerOrders";
import { linkGuestOrdersToCustomer } from "@/lib/server/guestOrderLinking";

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error(
    "This script must run against the Firestore emulator. Use `npm run test:guest-checkout`.",
  );
  process.exit(1);
}

/**
 * Proves the guest checkout feature end to end at the data layer:
 * - a guest sale (customerUid null) gets guestEmail/guestPhone/guestName and
 *   a high-entropy orderToken, same as recordSale generates for every sale.
 * - getOrderByToken resolves the right sale by token and nothing by a wrong one.
 * - an admin status change (the same path the Sales screen uses) appends to
 *   statusHistory, which is what /orders/[token]'s DeliveryTimeline reads.
 * - linkGuestOrdersToCustomer links a guest order to a new account by exact
 *   phone match unconditionally, and by email match ONLY when the caller's
 *   email is verified — never an unverified, just-typed email.
 */

const ATTAR_ID = "test-guest-attar";

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

  await products.doc(ATTAR_ID).set({
    productType: "attar",
    name: "Test Guest Attar",
    slug: ATTAR_ID,
    description: "Ephemeral product used only by the guest-checkout test.",
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

  console.log("\n1. Record a guest online sale (customerUid null, guest fields set)");
  const { saleId } = await recordSale({
    channel: "online",
    customerName: "Guest Test Customer",
    customerPhone: "9876522222",
    customerUid: null,
    guestEmail: "guest.test@example.com",
    guestPhone: "9876522222",
    guestName: "Guest Test Customer",
    items: [{ kind: "product", productId: ATTAR_ID, variantId: "oil-6ml", qty: 1 }],
    discount: 0,
    paymentMethod: "cod",
    paymentStatus: "pending",
    razorpayOrderId: null,
    razorpayPaymentId: null,
    orderStatus: "pending",
    shippingAddress: null,
    deliveryAddress: {
      label: "Delivery Address",
      fullName: "Guest Test Customer",
      phone: "9876522222",
      line1: "1 Test Street",
      line2: null,
      city: "Kochi",
      district: "Ernakulam",
      state: "Kerala",
      pincode: "682001",
      landmark: null,
    },
    createdByUid: "test-script",
  });

  const sale = (await salesCollection().doc(saleId).get()).data()!;
  check(sale.customerUid === null, "sale.customerUid is null");
  check(sale.guestEmail === "guest.test@example.com", "sale.guestEmail set from input");
  check(sale.guestPhone === "9876522222", "sale.guestPhone set from input");
  check(sale.guestName === "Guest Test Customer", "sale.guestName set from input");
  check(
    typeof sale.orderToken === "string" && sale.orderToken.length >= 32,
    `sale.orderToken is a high-entropy string (length ${sale.orderToken?.length})`,
  );

  console.log("\n2. getOrderByToken resolves by token, leaks nothing on a wrong token");
  const byToken = await getOrderByToken(sale.orderToken as string);
  check(byToken !== null && byToken.id === saleId, "correct token resolves the exact sale");
  const wrongToken = await getOrderByToken("not-a-real-token-00000000000000000000000000");
  check(wrongToken === null, "a fabricated token resolves to null (no enumeration)");
  const emptyToken = await getOrderByToken("");
  check(emptyToken === null, "an empty token resolves to null");

  console.log("\n3. Admin marks the order confirmed -> shipped (drives the tracking timeline)");
  await updateOrderStatus({
    saleId,
    newStatus: "confirmed",
    actingUid: "test-admin-uid",
    actingName: "Test Admin",
  });
  await updateOrderStatus({
    saleId,
    newStatus: "packed",
    actingUid: "test-admin-uid",
    actingName: "Test Admin",
  });
  await updateOrderStatus({
    saleId,
    newStatus: "shipped",
    actingUid: "test-admin-uid",
    actingName: "Test Admin",
  });

  const saleAfterStatus = (await salesCollection().doc(saleId).get()).data()!;
  check(saleAfterStatus.orderStatus === "shipped", "orderStatus is now shipped");
  check(
    saleAfterStatus.statusHistory?.length === 4,
    `statusHistory has 4 entries (pending, confirmed, packed, shipped) — got ${saleAfterStatus.statusHistory?.length}`,
  );
  const byTokenAfterStatus = await getOrderByToken(sale.orderToken as string);
  check(
    byTokenAfterStatus?.orderStatus === "shipped" &&
      byTokenAfterStatus?.statusHistory?.length === 4,
    "the same /orders/[token] lookup reflects the live status change immediately",
  );

  console.log("\n4. A second guest sale, matched by phone only (email unverified at signup)");
  const { saleId: saleId2 } = await recordSale({
    channel: "online",
    customerName: "Guest Test Customer",
    customerPhone: "9876522222",
    customerUid: null,
    guestEmail: "guest.test@example.com",
    guestPhone: "9876522222",
    guestName: "Guest Test Customer",
    items: [{ kind: "product", productId: ATTAR_ID, variantId: "oil-6ml", qty: 1 }],
    discount: 0,
    paymentMethod: "cod",
    paymentStatus: "pending",
    razorpayOrderId: null,
    razorpayPaymentId: null,
    orderStatus: "pending",
    shippingAddress: null,
    deliveryAddress: null,
    createdByUid: "test-script",
  });

  const NEW_UID = "test-guest-linking-customer";
  await customersCollection().doc(NEW_UID).set({
    name: "Guest Test Customer",
    email: "guest.test@example.com",
    phone: "9876522222",
    createdAt: FieldValue.serverTimestamp(),
    lastLoginAt: FieldValue.serverTimestamp(),
    marketingOptIn: false,
  });

  console.log("   4a. Signup-time link (email_verified=false) — only phone match should apply");
  const signupLink = await linkGuestOrdersToCustomer({ uid: NEW_UID, emailVerified: false });
  check(signupLink.linkedCount === 2, `both guest sales linked by phone match (got ${signupLink.linkedCount})`);

  const sale1AfterLink = (await salesCollection().doc(saleId).get()).data()!;
  const sale2AfterLink = (await salesCollection().doc(saleId2).get()).data()!;
  check(sale1AfterLink.customerUid === NEW_UID, "first guest sale now has customerUid set");
  check(sale2AfterLink.customerUid === NEW_UID, "second guest sale now has customerUid set");

  console.log("\n5. A third guest sale under a DIFFERENT phone, only matchable by verified email");
  const { saleId: saleId3 } = await recordSale({
    channel: "online",
    customerName: "Guest Test Customer 2",
    customerPhone: "9876533333",
    customerUid: null,
    guestEmail: "guest.test@example.com",
    guestPhone: "9876533333",
    guestName: "Guest Test Customer 2",
    items: [{ kind: "product", productId: ATTAR_ID, variantId: "oil-6ml", qty: 1 }],
    discount: 0,
    paymentMethod: "cod",
    paymentStatus: "pending",
    razorpayOrderId: null,
    razorpayPaymentId: null,
    orderStatus: "pending",
    shippingAddress: null,
    deliveryAddress: null,
    createdByUid: "test-script",
  });

  console.log("   5a. Login with email_verified=false does NOT link it (different phone, unverified email)");
  const unverifiedLoginLink = await linkGuestOrdersToCustomer({ uid: NEW_UID, emailVerified: false });
  check(unverifiedLoginLink.linkedCount === 0, `nothing newly linked (got ${unverifiedLoginLink.linkedCount})`);
  const sale3StillGuest = (await salesCollection().doc(saleId3).get()).data()!;
  check(sale3StillGuest.customerUid === null, "third sale still unlinked while email is unverified");

  console.log("   5b. Login with email_verified=true links it via verified email match");
  const verifiedLoginLink = await linkGuestOrdersToCustomer({ uid: NEW_UID, emailVerified: true });
  check(verifiedLoginLink.linkedCount === 1, `exactly the one remaining sale linked (got ${verifiedLoginLink.linkedCount})`);
  const sale3AfterLink = (await salesCollection().doc(saleId3).get()).data()!;
  check(sale3AfterLink.customerUid === NEW_UID, "third sale now linked to the account via verified email");

  // ---- cleanup ----
  await salesCollection().doc(saleId).delete();
  await salesCollection().doc(saleId2).delete();
  await salesCollection().doc(saleId3).delete();
  await customersCollection().doc(NEW_UID).delete();
  await products.doc(ATTAR_ID).delete();

  console.log(
    failures === 0
      ? "\nAll checks passed: guest sales get a working orderToken and guest fields, /orders/[token] resolves live status with no enumeration, and account linking respects phone-always / email-only-if-verified.\n"
      : `\n${failures} check(s) FAILED.\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

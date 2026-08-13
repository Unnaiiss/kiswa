import { FieldValue } from "firebase-admin/firestore";
import {
  combosCollection,
  productsCollection,
  salesCollection,
  stockMovementsCollection,
} from "@/lib/firestore/admin-collections";
import { recordSale } from "@/lib/server/recordSale";
import { IMPORTED_VARIANT_ID } from "@/lib/products";

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error(
    "This script must run against the Firestore emulator. Use `npm run test:whatsapp-order`.",
  );
  process.exit(1);
}

/**
 * Simulates recording a confirmed WhatsApp order the way Admin's WhatsApp
 * Orders screen does (app/api/admin/whatsapp-orders/sale/route.ts) — a
 * mixed order (a direct attar line, a direct imported line, a combo
 * bundling both, and a gift line) recorded via recordSale with
 * channel: "online". Proves stock deducts exactly like a POS sale and the
 * WhatsApp enquiry itself never touched it.
 */

const ATTAR_ID = "test-whatsapp-attar";
const IMPORTED_ID = "test-whatsapp-imported";
const COMBO_ID = "test-whatsapp-combo";

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
    name: "Test WhatsApp Attar",
    slug: ATTAR_ID,
    description: "Ephemeral product used only by the WhatsApp order test.",
    notes: ["test"],
    category: "Fragrance",
    imageUrls: [],
    isActive: true,
    oilStockMl: 30,
    lowStockThresholdMl: 10,
    variants: [
      {
        variantId: "oil-6ml",
        type: "oil",
        sizeMl: 6,
        priceInr: 250,
        mrpInr: 300,
        oilMlPerUnit: 6,
        isActive: true,
      },
    ],
    createdAt: FieldValue.serverTimestamp(),
  });

  await products.doc(IMPORTED_ID).set({
    productType: "imported",
    name: "Test WhatsApp Imported",
    slug: IMPORTED_ID,
    description: "Ephemeral product used only by the WhatsApp order test.",
    notes: [],
    category: "Imported",
    imageUrls: [],
    isActive: true,
    priceInr: 900,
    mrpInr: 1100,
    sizeLabel: "100ml EDP",
    brand: "Test Brand",
    unitStock: 10,
    lowStockThresholdUnits: 2,
    featuredOnHome: false,
    featuredOrder: null,
    createdAt: FieldValue.serverTimestamp(),
  });

  await combos.doc(COMBO_ID).set({
    title: "Test WhatsApp Combo",
    slug: COMBO_ID,
    description: "Ephemeral combo used only by the WhatsApp order test.",
    imageUrl: null,
    imageUrlMobile: null,
    comboPriceInr: 999,
    originalPriceInr: 1150,
    type: "fixed",
    items: [
      { productId: ATTAR_ID, variantId: "oil-6ml", productName: "Test WhatsApp Attar", variantLabel: "Oil 6ml", qty: 1 },
      { productId: IMPORTED_ID, variantId: IMPORTED_VARIANT_ID, productName: "Test WhatsApp Imported", variantLabel: "100ml EDP", qty: 1 },
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

  console.log(
    "\n1. Record a mixed WhatsApp-confirmed order: 1x attar oil-6ml (direct), 1x imported (direct, gift-wrapped), 1x combo (bundles one more of each) — channel: online",
  );
  const { saleId, invoiceNo } = await recordSale({
    channel: "online",
    customerName: "Test WhatsApp Customer",
    customerPhone: "9876500000",
    items: [
      { kind: "product", productId: ATTAR_ID, variantId: "oil-6ml", qty: 1 },
      {
        kind: "product",
        productId: IMPORTED_ID,
        variantId: IMPORTED_VARIANT_ID,
        qty: 1,
        isGift: true,
        giftRecipientName: "Aisha",
        giftMessage: "Happy birthday!",
        giftSenderName: "Zara",
        giftWrap: true,
      },
      { kind: "combo", comboId: COMBO_ID, qty: 1, selections: [] },
    ],
    discount: 0,
    paymentMethod: "upi",
    paymentStatus: "paid",
    razorpayOrderId: null,
    razorpayPaymentId: null,
    orderStatus: "pending",
    shippingAddress: null,
    createdByUid: "test-script",
  });
  check(invoiceNo.startsWith("KSW-"), "sale recorded with a KSW invoice number");

  // ---- Stock deducted exactly like a POS sale ----
  // Direct: 1x oil-6ml = 6ml. Combo: 1x oil-6ml component = 6ml. Total 12ml off 30ml.
  const attarAfter = (await products.doc(ATTAR_ID).get()).data()!;
  check(
    attarAfter.productType === "attar" && attarAfter.oilStockMl === 18,
    `attar oilStockMl is 18 (30 - 6 direct - 6 via combo, was ${
      attarAfter.productType === "attar" ? attarAfter.oilStockMl : "N/A"
    })`,
  );

  // Direct: 1 unit. Combo: 1 unit component. Total 2 off 10.
  const importedAfter = (await products.doc(IMPORTED_ID).get()).data()!;
  check(
    importedAfter.productType === "imported" && importedAfter.unitStock === 8,
    `imported unitStock is 8 (10 - 1 direct - 1 via combo, was ${
      importedAfter.productType === "imported" ? importedAfter.unitStock : "N/A"
    })`,
  );

  // ---- Stock movements carry reason: online_sale (not offline_sale) ----
  const movements = await stockMovementsCollection().where("referenceId", "==", saleId).get();
  const reasons = new Set(movements.docs.map((d) => d.data().reason));
  check(
    movements.size === 4 && reasons.size === 1 && reasons.has("online_sale"),
    `all 4 stock movements (2 direct + 2 combo components) recorded with reason "online_sale" (got ${movements.size} movements, reasons: ${[...reasons].join(", ")})`,
  );

  // ---- Sale doc carries gift + combo metadata through untouched ----
  const saleDoc = (await salesCollection().doc(saleId).get()).data()!;
  const giftLine = saleDoc.items.find((i) => i.productId === IMPORTED_ID);
  check(
    !!giftLine && giftLine.isGift === true && giftLine.giftRecipientName === "Aisha" && giftLine.giftWrap === true,
    "the imported line's gift metadata (recipient, wrap) is preserved on the sale doc",
  );
  const comboLine = saleDoc.items.find((i) => i.comboId === COMBO_ID);
  check(
    !!comboLine && comboLine.comboComponents?.length === 2,
    `the combo line expanded into 2 components on the sale doc (got ${comboLine?.comboComponents?.length ?? 0})`,
  );

  // ---- cleanup ----
  await products.doc(ATTAR_ID).delete();
  await products.doc(IMPORTED_ID).delete();
  await combos.doc(COMBO_ID).delete();

  console.log(
    failures === 0
      ? "\nAll checks passed: recording a confirmed WhatsApp order deducts oil ml / unit stock exactly like a POS sale, via the same recordSale transaction, with the sale's channel correctly marked online.\n"
      : `\n${failures} check(s) FAILED.\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

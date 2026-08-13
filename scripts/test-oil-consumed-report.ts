import { FieldValue } from "firebase-admin/firestore";
import { productsCollection, salesCollection } from "@/lib/firestore/admin-collections";
import { recordSale } from "@/lib/server/recordSale";
import {
  mlConsumedByChannel,
  oilUsageBreakdown,
  totalMlConsumed,
} from "@/lib/admin/salesAggregation";
import type { Sale } from "@/lib/firestore/types";

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error(
    "This script must run against the Firestore emulator. Use `npm run test:oil-report`.",
  );
  process.exit(1);
}

const TEST_PRODUCT_ID = "test-oil-report-product";

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
    productType: "attar",
    name: "Test Oil Report Product",
    slug: TEST_PRODUCT_ID,
    description: "Ephemeral product used only by the oil-report test.",
    notes: ["test"],
    category: "Fragrance",
    imageUrls: [],
    isActive: true,
    oilStockMl: 100,
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

  console.log(
    "\n1. POS sale of one Oil 3ml + one Spray 50ml (expected: 3 + 6 = 9ml)",
  );
  const { saleId } = await recordSale({
    channel: "offline",
    customerName: "Test Customer",
    customerPhone: "9999999999",
    items: [
      { kind: "product", productId: TEST_PRODUCT_ID, variantId: "oil-3ml", qty: 1 },
      { kind: "product", productId: TEST_PRODUCT_ID, variantId: "spray-50ml", qty: 1 },
    ],
    discount: 0,
    paymentMethod: "cash",
    paymentStatus: "paid",
    razorpayOrderId: null,
    razorpayPaymentId: null,
    orderStatus: "pending",
    shippingAddress: null,
    createdByUid: "test-script",
  });

  const saleSnap = await salesCollection().doc(saleId).get();
  const saleData = saleSnap.data()!;
  const sale: Sale = { id: saleId, ...saleData };

  const oilItem = sale.items.find((i) => i.variantId === "oil-3ml")!;
  const sprayItem = sale.items.find((i) => i.variantId === "spray-50ml")!;

  check(oilItem.oilMlUsed === 3, `Oil 3ml item snapshots oilMlUsed=3 (was ${oilItem.oilMlUsed})`);
  check(
    sprayItem.oilMlUsed === 6,
    `Spray 50ml item snapshots oilMlUsed=6 (was ${sprayItem.oilMlUsed})`,
  );
  check(
    sale.totalOilMlUsed === 9,
    `Sale totalOilMlUsed=9 (was ${sale.totalOilMlUsed})`,
  );

  const productAfter = (await products.doc(TEST_PRODUCT_ID).get()).data()!;
  check(
    productAfter.productType === "attar" && productAfter.oilStockMl === 91,
    `Product oilStockMl reduced by 9, from 100 to 91 (was ${
      productAfter.productType === "attar" ? productAfter.oilStockMl : "N/A"
    })`,
  );

  console.log("\n2. Reports aggregation over this single sale");
  const total = totalMlConsumed([sale]);
  check(total === 9, `totalMlConsumed([sale]) === 9 (was ${total})`);

  const byChannel = mlConsumedByChannel([sale]);
  check(
    byChannel.offline === 9 && byChannel.online === 0,
    `mlConsumedByChannel splits 9ml to offline, 0 to online (was ${JSON.stringify(byChannel)})`,
  );

  const breakdown = oilUsageBreakdown([sale]);
  const oilRow = breakdown.find((r) => r.variantLabel === "Oil 3ml");
  const sprayRow = breakdown.find((r) => r.variantLabel === "Spray 50ml");
  check(
    !!oilRow && oilRow.unitsSold === 1 && oilRow.oilMlUsed === 3,
    `oilUsageBreakdown has Oil 3ml row: 1 unit, 3ml (was ${JSON.stringify(oilRow)})`,
  );
  check(
    !!sprayRow && sprayRow.unitsSold === 1 && sprayRow.oilMlUsed === 6,
    `oilUsageBreakdown has Spray 50ml row: 1 unit, 6ml (was ${JSON.stringify(sprayRow)})`,
  );

  await products.doc(TEST_PRODUCT_ID).delete();

  console.log(
    failures === 0
      ? "\nAll checks passed: a 1x Oil 3ml + 1x Spray 50ml sale reports exactly 9ml used and reduces oilStockMl by 9.\n"
      : `\n${failures} check(s) FAILED.\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

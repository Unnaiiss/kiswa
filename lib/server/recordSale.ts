import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import {
  combosCollection,
  invoiceCounterDoc,
  productsCollection,
  salesCollection,
  stockMovementsCollection,
} from "@/lib/firestore/admin-collections";
import { formatVariantLabel } from "@/lib/pricing";
import type { ComboDoc, ComboSaleComponent, ProductDoc, SaleItem } from "@/lib/firestore/types";

const productSaleItemInputSchema = z.object({
  kind: z.literal("product"),
  productId: z.string().min(1),
  variantId: z.string().min(1),
  qty: z.number().int().positive(),
  isGift: z.boolean().default(false),
  giftRecipientName: z.string().trim().nullable().default(null),
  giftMessage: z.string().trim().max(200).nullable().default(null),
  giftSenderName: z.string().trim().nullable().default(null),
  giftWrap: z.boolean().default(false),
});

/** comboId + qty is the customer's intent; selections names their picks for
 * a 'choose-any' combo (ignored for 'fixed', which uses the combo doc's own
 * items[]). Price, title, and component expansion are always re-derived
 * from the live combo + product docs inside the transaction below, never
 * trusted from the caller. */
const comboSaleItemInputSchema = z.object({
  kind: z.literal("combo"),
  comboId: z.string().min(1),
  qty: z.number().int().positive(),
  selections: z
    .array(z.object({ productId: z.string().min(1), variantId: z.string().min(1) }))
    .default([]),
});

const saleItemInputSchema = z.discriminatedUnion("kind", [
  productSaleItemInputSchema,
  comboSaleItemInputSchema,
]);

const shippingAddressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().nullable().default(null),
  city: z.string().min(1),
  state: z.string().min(1),
  pincode: z.string().min(1),
  country: z.string().min(1),
});

const giftShippingAddressSchema = shippingAddressSchema.extend({
  name: z.string().min(1),
  phone: z.string().min(1),
});

export const recordSaleInputSchema = z.object({
  channel: z.enum(["online", "offline"]),
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  items: z.array(saleItemInputSchema).min(1),
  discount: z.number().nonnegative().default(0),
  paymentMethod: z.enum(["razorpay", "cash", "upi", "card"]),
  paymentStatus: z.enum(["pending", "paid", "failed", "refunded"]),
  razorpayOrderId: z.string().nullable().default(null),
  razorpayPaymentId: z.string().nullable().default(null),
  orderStatus: z.enum([
    "pending",
    "paid",
    "packed",
    "shipped",
    "delivered",
    "cancelled",
  ]),
  shippingAddress: shippingAddressSchema.nullable().default(null),
  createdByUid: z.string().min(1),
  giftShippingAddress: giftShippingAddressSchema.nullable().default(null),
  hidePrices: z.boolean().default(false),
});

// z.input (not z.infer/z.output) so callers can omit fields that have zod
// defaults (e.g. gift fields, hidePrices) — recordSale() itself normalizes
// them via .parse() before use.
export type RecordSaleInput = z.input<typeof recordSaleInputSchema>;

export interface RecordSaleResult {
  saleId: string;
  invoiceNo: string;
}

export function formatInvoiceNo(year: number, seq: number): string {
  return `KSW-${year}-${String(seq).padStart(4, "0")}`;
}

interface ComboComponentQty {
  productId: string;
  variantId: string;
  qty: number;
}

function assertComboAvailable(combo: ComboDoc) {
  if (!combo.isActive) {
    throw new Error(`${combo.title} is no longer available`);
  }
  const now = new Date();
  if (combo.validFrom && combo.validFrom.toDate() > now) {
    throw new Error(`${combo.title} is not available yet`);
  }
  if (combo.validUntil && combo.validUntil.toDate() < now) {
    throw new Error(`${combo.title} has expired`);
  }
}

/** Expands a combo line into its per-ONE-combo-unit components (grouped by
 * variant, so a repeated choose-any pick becomes qty 2 rather than two rows).
 * The caller multiplies by the combo line's own qty afterward. */
function comboComponentsPerUnit(
  combo: ComboDoc,
  selections: { productId: string; variantId: string }[],
): ComboComponentQty[] {
  if (combo.type === "fixed") {
    return combo.items.map((i) => ({
      productId: i.productId,
      variantId: i.variantId,
      qty: i.qty,
    }));
  }

  if (combo.chooseCount === null || selections.length !== combo.chooseCount) {
    throw new Error(
      `${combo.title} requires exactly ${combo.chooseCount ?? 0} selections`,
    );
  }
  const eligibleKeys = new Set(
    combo.eligibleVariants.map((v) => `${v.productId}:${v.variantId}`),
  );
  const grouped = new Map<string, ComboComponentQty>();
  for (const sel of selections) {
    const key = `${sel.productId}:${sel.variantId}`;
    if (!eligibleKeys.has(key)) {
      throw new Error(`${combo.title}: an invalid selection was submitted`);
    }
    const existing = grouped.get(key);
    if (existing) existing.qty += 1;
    else grouped.set(key, { productId: sel.productId, variantId: sel.variantId, qty: 1 });
  }
  return [...grouped.values()];
}

export async function recordSale(
  rawInput: RecordSaleInput,
): Promise<RecordSaleResult> {
  const input = recordSaleInputSchema.parse(rawInput);
  const products = productsCollection();
  const combos = combosCollection();
  const counterRef = invoiceCounterDoc();
  const saleRef = salesCollection().doc();
  const movements = stockMovementsCollection();

  const invoiceNo = await adminDb.runTransaction(
    async (tx) => {
      // ---- ALL READS FIRST ----
      const comboIds = [
        ...new Set(
          input.items
            .filter((i) => i.kind === "combo")
            .map((i) => i.comboId),
        ),
      ];
      const comboSnaps = await Promise.all(
        comboIds.map((id) => tx.get(combos.doc(id))),
      );
      const comboMap = new Map<string, ComboDoc>();
      comboSnaps.forEach((snap, idx) => {
        const data = snap.data();
        if (!snap.exists || !data) {
          throw new Error(`Combo ${comboIds[idx]} not found`);
        }
        comboMap.set(comboIds[idx], data);
      });

      // Expand every combo line into its per-unit components now (needs
      // only the combo doc, just read above) so every productId this sale
      // touches is known before reading product docs.
      const comboExpansions = new Map<number, ComboComponentQty[]>();
      input.items.forEach((item, idx) => {
        if (item.kind !== "combo") return;
        const combo = comboMap.get(item.comboId)!;
        assertComboAvailable(combo);
        comboExpansions.set(idx, comboComponentsPerUnit(combo, item.selections));
      });

      const productIds = new Set<string>();
      input.items.forEach((item, idx) => {
        if (item.kind === "product") {
          productIds.add(item.productId);
        } else {
          for (const c of comboExpansions.get(idx)!) productIds.add(c.productId);
        }
      });
      const productIdList = [...productIds];
      const productRefs = productIdList.map((id) => products.doc(id));
      const productSnaps = await Promise.all(
        productRefs.map((ref) => tx.get(ref)),
      );
      const counterSnap = await tx.get(counterRef);

      // ---- VALIDATE ----
      const productMap = new Map<string, ProductDoc>();
      productSnaps.forEach((snap, idx) => {
        const data = snap.data();
        if (!snap.exists || !data) {
          throw new Error(`Product ${productIdList[idx]} not found`);
        }
        productMap.set(productIdList[idx], data);
      });

      // Flat (productId, variantId) -> qty draw this sale makes — one entry
      // per direct product item, N entries per combo line (its expanded
      // components × the line's own qty). Aggregating them all into one map
      // (rather than per-source) means a fragrance bought both directly and
      // via a combo in the same sale nets against its one shared oil pool.
      const qtyByProductVariant = new Map<string, Map<string, number>>();
      function addDraw(productId: string, variantId: string, qty: number) {
        const product = productMap.get(productId);
        if (!product) throw new Error(`Product ${productId} not found`);
        const variant = product.variants.find((v) => v.variantId === variantId);
        if (!variant) {
          throw new Error(`Variant ${variantId} not found on product ${productId}`);
        }
        const perVariant =
          qtyByProductVariant.get(productId) ?? new Map<string, number>();
        perVariant.set(variantId, (perVariant.get(variantId) ?? 0) + qty);
        qtyByProductVariant.set(productId, perVariant);
      }
      input.items.forEach((item, idx) => {
        if (item.kind === "product") {
          addDraw(item.productId, item.variantId, item.qty);
        } else {
          for (const c of comboExpansions.get(idx)!) {
            addDraw(c.productId, c.variantId, c.qty * item.qty);
          }
        }
      });

      // Validate: every variant drawn must be active, and each product's
      // total ml need — summed across every draw of that product in this
      // sale, direct or combo-sourced, since all its variants are bottled
      // from one oil pool — must not exceed what's left in stock.
      const mlNeededByProduct = new Map<string, number>();
      for (const [productId, perVariant] of qtyByProductVariant) {
        const product = productMap.get(productId)!;
        let mlNeeded = 0;
        for (const [variantId, qty] of perVariant) {
          const variant = product.variants.find(
            (v) => v.variantId === variantId,
          )!;
          if (!variant.isActive) {
            throw new Error(
              `${product.name} (${variant.type} ${variant.sizeMl}ml) is not available for sale`,
            );
          }
          mlNeeded += qty * variant.oilMlPerUnit;
        }
        if (product.oilStockMl < mlNeeded) {
          throw new Error(
            `Insufficient oil stock for ${product.name}: have ${product.oilStockMl}ml, need ${mlNeeded}ml`,
          );
        }
        mlNeededByProduct.set(productId, mlNeeded);
      }

      // ---- BUILD SALE ITEMS + STOCK-MOVEMENT DRAWS ----
      // One SaleItem per input line (product or combo — a combo never
      // explodes into multiple SaleItems, its components live nested under
      // comboComponents instead), but one stockMovement per underlying
      // (productId, variantId) draw, so a combo's oil deduction stays
      // itemized per fragrance in the audit trail.
      const saleItems: SaleItem[] = [];
      const movementDraws: {
        productId: string;
        productName: string;
        variantId: string;
        variantLabel: string;
        mlChange: number;
        note: string | null;
      }[] = [];

      input.items.forEach((item, idx) => {
        if (item.kind === "product") {
          const product = productMap.get(item.productId)!;
          const variant = product.variants.find(
            (v) => v.variantId === item.variantId,
          )!;
          const oilMlUsed = variant.oilMlPerUnit * item.qty;
          saleItems.push({
            productId: item.productId,
            productName: product.name,
            variantId: variant.variantId,
            sizeMl: variant.sizeMl,
            unitPrice: variant.priceInr,
            qty: item.qty,
            lineTotal: variant.priceInr * item.qty,
            oilMlUsed,
            isGift: item.isGift,
            giftRecipientName: item.giftRecipientName,
            giftMessage: item.giftMessage,
            giftSenderName: item.giftSenderName,
            giftWrap: item.giftWrap,
          });
          movementDraws.push({
            productId: item.productId,
            productName: product.name,
            variantId: variant.variantId,
            variantLabel: formatVariantLabel(variant.type, variant.sizeMl),
            mlChange: -oilMlUsed,
            note: null,
          });
          return;
        }

        const combo = comboMap.get(item.comboId)!;
        const componentsPerUnit = comboExpansions.get(idx)!;
        const comboComponents: ComboSaleComponent[] = componentsPerUnit.map((c) => {
          const product = productMap.get(c.productId)!;
          const variant = product.variants.find((v) => v.variantId === c.variantId)!;
          const totalQty = c.qty * item.qty;
          const oilMlUsed = variant.oilMlPerUnit * totalQty;
          movementDraws.push({
            productId: c.productId,
            productName: product.name,
            variantId: variant.variantId,
            variantLabel: formatVariantLabel(variant.type, variant.sizeMl),
            mlChange: -oilMlUsed,
            note: `Combo: ${combo.title}`,
          });
          return {
            productId: c.productId,
            productName: product.name,
            variantId: variant.variantId,
            variantLabel: formatVariantLabel(variant.type, variant.sizeMl),
            sizeMl: variant.sizeMl,
            qty: totalQty,
            oilMlUsed,
          };
        });
        const totalOilMlUsed = comboComponents.reduce(
          (sum, c) => sum + c.oilMlUsed,
          0,
        );

        saleItems.push({
          productId: item.comboId,
          productName: combo.title,
          variantId: "combo",
          sizeMl: 0,
          unitPrice: combo.comboPriceInr,
          qty: item.qty,
          lineTotal: combo.comboPriceInr * item.qty,
          oilMlUsed: totalOilMlUsed,
          comboId: item.comboId,
          comboTitle: combo.title,
          comboComponents,
        });
      });

      const subtotal = saleItems.reduce((sum, i) => sum + i.lineTotal, 0);
      const total = subtotal - input.discount;
      const totalOilMlUsed = saleItems.reduce(
        (sum, i) => sum + (i.oilMlUsed ?? 0),
        0,
      );

      const year = new Date().getFullYear();
      const counterData = counterSnap.data();
      const seq =
        counterData && counterData.year === year ? counterData.seq + 1 : 1;
      const invoiceNo = formatInvoiceNo(year, seq);

      // ---- ALL WRITES FROM HERE ----
      for (const [productId, mlNeeded] of mlNeededByProduct) {
        const product = productMap.get(productId)!;
        tx.update(products.doc(productId), {
          oilStockMl: product.oilStockMl - mlNeeded,
        });
      }

      const saleReason =
        input.channel === "online" ? "online_sale" : "offline_sale";
      for (const draw of movementDraws) {
        tx.set(movements.doc(), {
          productId: draw.productId,
          productName: draw.productName,
          variantId: draw.variantId,
          variantLabel: draw.variantLabel,
          mlChange: draw.mlChange,
          reason: saleReason,
          referenceId: saleRef.id,
          note: draw.note,
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      tx.set(counterRef, { year, seq });

      tx.set(saleRef, {
        channel: input.channel,
        invoiceNo,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        items: saleItems,
        subtotal,
        discount: input.discount,
        total,
        paymentMethod: input.paymentMethod,
        paymentStatus: input.paymentStatus,
        razorpayOrderId: input.razorpayOrderId,
        razorpayPaymentId: input.razorpayPaymentId,
        orderStatus: input.orderStatus,
        shippingAddress: input.shippingAddress,
        createdByUid: input.createdByUid,
        createdAt: FieldValue.serverTimestamp(),
        totalOilMlUsed,
        giftShippingAddress: input.giftShippingAddress,
        hidePrices: input.hidePrices,
      });

      return invoiceNo;
    },
  );

  return { saleId: saleRef.id, invoiceNo };
}

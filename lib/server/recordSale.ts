import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import {
  invoiceCounterDoc,
  productsCollection,
  salesCollection,
  stockMovementsCollection,
} from "@/lib/firestore/admin-collections";
import { formatVariantLabel } from "@/lib/pricing";
import type { ProductDoc, SaleItem } from "@/lib/firestore/types";

const saleItemInputSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1),
  qty: z.number().int().positive(),
});

const shippingAddressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().nullable().default(null),
  city: z.string().min(1),
  state: z.string().min(1),
  pincode: z.string().min(1),
  country: z.string().min(1),
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
});

export type RecordSaleInput = z.infer<typeof recordSaleInputSchema>;

export interface RecordSaleResult {
  saleId: string;
  invoiceNo: string;
}

export function formatInvoiceNo(year: number, seq: number): string {
  return `KSW-${year}-${String(seq).padStart(4, "0")}`;
}

export async function recordSale(
  rawInput: RecordSaleInput,
): Promise<RecordSaleResult> {
  const input = recordSaleInputSchema.parse(rawInput);
  const products = productsCollection();
  const counterRef = invoiceCounterDoc();
  const saleRef = salesCollection().doc();
  const movements = stockMovementsCollection();

  const invoiceNo = await adminDb.runTransaction(
    async (tx) => {
      // ---- ALL READS FIRST ----
      const productIds = [...new Set(input.items.map((i) => i.productId))];
      const productRefs = productIds.map((id) => products.doc(id));
      const productSnaps = await Promise.all(
        productRefs.map((ref) => tx.get(ref)),
      );
      const counterSnap = await tx.get(counterRef);

      // ---- VALIDATE ----
      const productMap = new Map<string, ProductDoc>();
      productSnaps.forEach((snap, idx) => {
        const data = snap.data();
        if (!snap.exists || !data) {
          throw new Error(`Product ${productIds[idx]} not found`);
        }
        productMap.set(productIds[idx], data);
      });

      // Aggregate requested qty per (productId, variantId) so the same
      // variant sold twice in one bill is checked/decremented once.
      const qtyByProductVariant = new Map<string, Map<string, number>>();
      for (const item of input.items) {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }
        const variant = product.variants.find(
          (v) => v.variantId === item.variantId,
        );
        if (!variant) {
          throw new Error(
            `Variant ${item.variantId} not found on product ${item.productId}`,
          );
        }
        const perVariant =
          qtyByProductVariant.get(item.productId) ?? new Map<string, number>();
        perVariant.set(
          item.variantId,
          (perVariant.get(item.variantId) ?? 0) + item.qty,
        );
        qtyByProductVariant.set(item.productId, perVariant);
      }

      // Validate: every variant sold must be active, and each product's
      // total ml need — summed across every item of that product in this
      // sale, since all its variants are bottled from one oil pool — must
      // not exceed what's left in stock.
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

      const saleItems: SaleItem[] = input.items.map((item) => {
        const product = productMap.get(item.productId)!;
        const variant = product.variants.find(
          (v) => v.variantId === item.variantId,
        )!;
        return {
          productId: item.productId,
          productName: product.name,
          variantId: variant.variantId,
          sizeMl: variant.sizeMl,
          unitPrice: variant.priceInr,
          qty: item.qty,
          lineTotal: variant.priceInr * item.qty,
          mlUsed: variant.oilMlPerUnit * item.qty,
        };
      });

      const subtotal = saleItems.reduce((sum, i) => sum + i.lineTotal, 0);
      const total = subtotal - input.discount;

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
      for (const item of saleItems) {
        const product = productMap.get(item.productId)!;
        const variant = product.variants.find(
          (v) => v.variantId === item.variantId,
        )!;
        tx.set(movements.doc(), {
          productId: item.productId,
          productName: item.productName,
          variantId: item.variantId,
          variantLabel: formatVariantLabel(variant.type, variant.sizeMl),
          // mlUsed is optional on the type only for legacy pre-bulk-oil sales
          // read back from Firestore — saleItems above was just built fresh.
          mlChange: -item.mlUsed!,
          reason: saleReason,
          referenceId: saleRef.id,
          note: null,
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
      });

      return invoiceNo;
    },
  );

  return { saleId: saleRef.id, invoiceNo };
}

import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import {
  productsCollection,
  stockMovementsCollection,
} from "@/lib/firestore/admin-collections";

export const stockAdjustInputSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1),
  qtyChange: z.number().int().refine((n) => n !== 0, "qtyChange must be nonzero"),
  note: z.string().min(1),
});

export type StockAdjustInput = z.infer<typeof stockAdjustInputSchema>;

export async function stockAdjust(rawInput: StockAdjustInput): Promise<void> {
  const input = stockAdjustInputSchema.parse(rawInput);
  const products = productsCollection();
  const movements = stockMovementsCollection();

  await adminDb.runTransaction(async (tx) => {
    // ---- READ ----
    const productRef = products.doc(input.productId);
    const snap = await tx.get(productRef);
    const product = snap.data();
    if (!snap.exists || !product) {
      throw new Error(`Product ${input.productId} not found`);
    }
    const variant = product.variants.find(
      (v) => v.variantId === input.variantId,
    );
    if (!variant) {
      throw new Error(
        `Variant ${input.variantId} not found on product ${input.productId}`,
      );
    }

    const newStock = variant.stock + input.qtyChange;
    if (newStock < 0) {
      throw new Error(
        `Adjustment would result in negative stock for ${product.name} (${variant.type} ${variant.sizeMl}ml): have ${variant.stock}, change ${input.qtyChange}`,
      );
    }

    // ---- WRITE ----
    const updatedVariants = product.variants.map((v) =>
      v.variantId === input.variantId ? { ...v, stock: newStock } : v,
    );
    tx.update(productRef, { variants: updatedVariants });

    tx.set(movements.doc(), {
      productId: input.productId,
      productName: product.name,
      variantId: variant.variantId,
      sizeMl: variant.sizeMl,
      qtyChange: input.qtyChange,
      reason: "adjustment",
      referenceId: null,
      note: input.note,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
}

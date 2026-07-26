import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import {
  productsCollection,
  stockMovementsCollection,
} from "@/lib/firestore/admin-collections";

export const stockInInputSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1),
  qty: z.number().int().positive(),
  reason: z.enum(["opening_stock", "purchase", "return"]),
  note: z.string().nullable().default(null),
});

export type StockInInput = z.infer<typeof stockInInputSchema>;

export async function stockIn(rawInput: StockInInput): Promise<void> {
  const input = stockInInputSchema.parse(rawInput);
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

    // ---- WRITE ----
    const updatedVariants = product.variants.map((v) =>
      v.variantId === input.variantId
        ? { ...v, stock: v.stock + input.qty }
        : v,
    );
    tx.update(productRef, { variants: updatedVariants });

    tx.set(movements.doc(), {
      productId: input.productId,
      productName: product.name,
      variantId: variant.variantId,
      sizeMl: variant.sizeMl,
      qtyChange: input.qty,
      reason: input.reason,
      referenceId: null,
      note: input.note,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
}

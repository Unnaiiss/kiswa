import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import {
  productsCollection,
  stockMovementsCollection,
} from "@/lib/firestore/admin-collections";

export const stockInInputSchema = z.object({
  productId: z.string().min(1),
  ml: z.number().positive(),
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

    // ---- WRITE ----
    tx.update(productRef, { oilStockMl: product.oilStockMl + input.ml });

    tx.set(movements.doc(), {
      productId: input.productId,
      productName: product.name,
      variantId: null,
      variantLabel: null,
      mlChange: input.ml,
      reason: input.reason,
      referenceId: null,
      note: input.note,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
}

import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import {
  productsCollection,
  stockMovementsCollection,
} from "@/lib/firestore/admin-collections";

export const stockAdjustInputSchema = z.object({
  productId: z.string().min(1),
  mlChange: z.number().refine((n) => n !== 0, "mlChange must be nonzero"),
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

    const newStock = product.oilStockMl + input.mlChange;
    if (newStock < 0) {
      throw new Error(
        `Adjustment would result in negative oil stock for ${product.name}: have ${product.oilStockMl}ml, change ${input.mlChange}ml`,
      );
    }

    // ---- WRITE ----
    tx.update(productRef, { oilStockMl: newStock });

    tx.set(movements.doc(), {
      productId: input.productId,
      productName: product.name,
      variantId: null,
      variantLabel: null,
      mlChange: input.mlChange,
      reason: "adjustment",
      referenceId: null,
      note: input.note,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
}

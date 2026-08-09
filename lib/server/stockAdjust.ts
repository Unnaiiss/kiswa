import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import {
  productsCollection,
  stockMovementsCollection,
} from "@/lib/firestore/admin-collections";
import { PublicError } from "@/lib/server/publicError";

export const stockAdjustInputSchema = z.object({
  productId: z.string().min(1),
  /** +/- ml (attar) or whole bottles (imported — validated as an integer
   * once the product's type is known inside the transaction). */
  amountChange: z.number().refine((n) => n !== 0, "amountChange must be nonzero"),
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
      throw new PublicError(`Product ${input.productId} not found`);
    }

    if (product.productType === "imported") {
      if (!Number.isInteger(input.amountChange)) {
        throw new PublicError(`${product.name} is sold as whole bottles — enter a whole number.`);
      }
      const newStock = product.unitStock + input.amountChange;
      if (newStock < 0) {
        throw new PublicError(
          `Adjustment would result in negative stock for ${product.name}: have ${product.unitStock}, change ${input.amountChange}`,
        );
      }

      // ---- WRITE ----
      tx.update(productRef, { unitStock: newStock });

      tx.set(movements.doc(), {
        productId: input.productId,
        productName: product.name,
        variantId: null,
        variantLabel: product.sizeLabel,
        mlChange: input.amountChange,
        unit: "unit",
        reason: "adjustment",
        referenceId: null,
        note: input.note,
        createdAt: FieldValue.serverTimestamp(),
      });
      return;
    }

    const newStock = product.oilStockMl + input.amountChange;
    if (newStock < 0) {
      throw new PublicError(
        `Adjustment would result in negative oil stock for ${product.name}: have ${product.oilStockMl}ml, change ${input.amountChange}ml`,
      );
    }

    // ---- WRITE ----
    tx.update(productRef, { oilStockMl: newStock });

    tx.set(movements.doc(), {
      productId: input.productId,
      productName: product.name,
      variantId: null,
      variantLabel: null,
      mlChange: input.amountChange,
      unit: "ml",
      reason: "adjustment",
      referenceId: null,
      note: input.note,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
}

import type { ProductDoc } from "@/lib/firestore/types";
import { IMPORTED_VARIANT_ID, livePriceForVariant } from "@/lib/products";
import { PublicError } from "@/lib/server/publicError";

export { IMPORTED_VARIANT_ID, livePriceForVariant };

export class InsufficientStockError extends PublicError {}

export interface ProductNeed {
  productId: string;
  productName: string;
  kind: "attar" | "imported";
  /** ml (attar) or whole units (imported) this sale would consume from the
   * product's shared pool. */
  amountNeeded: number;
}

/**
 * Validates every product/variant referenced by a (productId -> variantId ->
 * qty) draw map is active with enough stock, and returns how much of each
 * product's pool this sale would consume — ml for attar (summed across every
 * variant drawn, direct or combo-sourced, since they share one oilStockMl),
 * whole units for imported. Throws InsufficientStockError with a
 * customer-facing message on the first violation found.
 *
 * Shared by recordSale (which also uses the returned amounts to decrement
 * stock) and create-order (a pre-check for a faster UX failure before a
 * Razorpay order is even created — recordSale's own transaction is still the
 * actual authority at payment-confirmation time regardless).
 */
export function aggregateProductNeeds(
  productMap: Map<string, ProductDoc>,
  qtyByProductVariant: Map<string, Map<string, number>>,
): Map<string, ProductNeed> {
  const needs = new Map<string, ProductNeed>();

  for (const [productId, perVariant] of qtyByProductVariant) {
    const product = productMap.get(productId);
    if (!product) {
      throw new InsufficientStockError(`Product ${productId} not found`);
    }

    if (product.productType === "imported") {
      if (!product.isActive) {
        throw new InsufficientStockError(`${product.name} is not available for sale`);
      }
      let unitsNeeded = 0;
      for (const [variantId, qty] of perVariant) {
        if (variantId !== IMPORTED_VARIANT_ID) {
          throw new InsufficientStockError(`${product.name} is not available for sale`);
        }
        unitsNeeded += qty;
      }
      if (product.unitStock < unitsNeeded) {
        throw new InsufficientStockError(
          `Not enough ${product.name} in stock: have ${product.unitStock}, need ${unitsNeeded}`,
        );
      }
      needs.set(productId, {
        productId,
        productName: product.name,
        kind: "imported",
        amountNeeded: unitsNeeded,
      });
      continue;
    }

    let mlNeeded = 0;
    for (const [variantId, qty] of perVariant) {
      const variant = product.variants.find((v) => v.variantId === variantId);
      if (!variant || !variant.isActive) {
        throw new InsufficientStockError(
          `${product.name} (${variant?.type ?? variantId} ${variant?.sizeMl ?? ""}ml) is not available for sale`,
        );
      }
      mlNeeded += qty * variant.oilMlPerUnit;
    }
    if (product.oilStockMl < mlNeeded) {
      throw new InsufficientStockError(
        `Insufficient oil stock for ${product.name}: have ${product.oilStockMl}ml, need ${mlNeeded}ml`,
      );
    }
    needs.set(productId, {
      productId,
      productName: product.name,
      kind: "attar",
      amountNeeded: mlNeeded,
    });
  }

  return needs;
}

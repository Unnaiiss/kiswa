import type { ProductType, ProductVariant } from "@/lib/firestore/types";
import { getStartingPrice, maxAdditionalUnits } from "@/lib/pricing";

/** Placeholder variantId used everywhere a (productId, variantId) pair is
 * needed to address an imported product line — mirrors how combo lines
 * already use the literal "combo" as their own placeholder variantId.
 * Imported products have no real variant entity (one price, one size). */
export const IMPORTED_VARIANT_ID = "unit";

export function isAttarProduct<T extends { productType: ProductType }>(
  product: T,
): product is T & { productType: "attar" } {
  return product.productType === "attar";
}

export function isImportedProduct<T extends { productType: ProductType }>(
  product: T,
): product is T & { productType: "imported" } {
  return product.productType === "imported";
}

/** Only the fields product-stock/price helpers actually need — both the
 * server's ProductDoc and the storefront's createdAt-stripped StoreProduct
 * satisfy this structurally, so callers on either side of the RSC boundary
 * can pass their own product straight through. */
export type ProductStockShape =
  | { productType: "attar"; isActive: boolean; oilStockMl: number; variants: ProductVariant[] }
  | { productType: "imported"; isActive: boolean; priceInr: number; unitStock: number };

/** The single price shown for a product card/tile — the attar starting
 * price across its active variants, or the imported product's one price. */
export function productDisplayPrice(product: ProductStockShape): number {
  if (product.productType === "imported") return product.priceInr;
  return getStartingPrice(product.variants);
}

/** How many more units of a (productId, variantId) draw can be added right
 * now — attar: from the remaining oil pool given a variant's oilMlPerUnit;
 * imported: the product's own unitStock directly (no per-unit oil cost).
 * Doesn't net out anything already committed elsewhere (e.g. in the current
 * cart/bill) — callers that need that do their own subtraction first, same
 * as the pre-existing attar-only version of this logic. */
export function remainingCapacity(
  product: ProductStockShape | undefined,
  variantId: string,
): number {
  if (!product || !product.isActive) return 0;
  if (product.productType === "imported") {
    return variantId === IMPORTED_VARIANT_ID ? Math.max(0, Math.floor(product.unitStock)) : 0;
  }
  const variant = product.variants.find((v) => v.variantId === variantId);
  if (!variant || !variant.isActive) return 0;
  return maxAdditionalUnits(product.oilStockMl, variant.oilMlPerUnit);
}

/** Live price for a (productId, variantId) draw, or null if the product is
 * missing, inactive, or (attar) the variant doesn't exist/is inactive.
 * Never trust client-supplied prices — always look this up fresh from a
 * live product doc. */
export function livePriceForVariant(
  product: ProductStockShape | undefined,
  variantId: string,
): number | null {
  if (!product || !product.isActive) return null;
  if (product.productType === "imported") {
    return variantId === IMPORTED_VARIANT_ID ? product.priceInr : null;
  }
  const variant = product.variants.find((v) => v.variantId === variantId);
  return variant && variant.isActive ? variant.priceInr : null;
}

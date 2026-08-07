import type {
  Combo,
  ComboEligibleVariant,
  ComboFixedItem,
  ComboType,
} from "@/lib/firestore/types";
import { IMPORTED_VARIANT_ID, type ProductStockShape, livePriceForVariant, remainingCapacity } from "@/lib/products";

/** True if every fixed component's product/variant is active and there's
 * enough stock for this combo's own bundle — ml aggregated per attar
 * product (since two components can share one product's pool), units
 * aggregated per imported product. */
export function isFixedComboFulfillable(
  items: ComboFixedItem[],
  productsById: Map<string, ProductStockShape>,
): boolean {
  const neededByProduct = new Map<string, number>();
  for (const item of items) {
    const product = productsById.get(item.productId);
    if (!product || !product.isActive) return false;
    if (product.productType === "imported") {
      if (item.variantId !== IMPORTED_VARIANT_ID) return false;
      neededByProduct.set(item.productId, (neededByProduct.get(item.productId) ?? 0) + item.qty);
      continue;
    }
    const variant = product.variants.find((v) => v.variantId === item.variantId);
    if (!variant || !variant.isActive) return false;
    neededByProduct.set(
      item.productId,
      (neededByProduct.get(item.productId) ?? 0) + item.qty * variant.oilMlPerUnit,
    );
  }
  for (const [productId, needed] of neededByProduct) {
    const product = productsById.get(productId)!;
    const available = product.productType === "imported" ? product.unitStock : product.oilStockMl;
    if (available < needed) return false;
  }
  return true;
}

/** Optimistic "is this worth showing" check: true if there's enough combined
 * capacity across eligible variants to plausibly complete a chooseCount
 * pick. Treats each eligible variant's capacity independently against its
 * product's full remaining pool — several eligible variants sharing one
 * product's pool make true joint feasibility a bin-packing problem, which
 * isn't worth solving here since recordSale's transaction is the actual
 * authority at purchase time regardless. */
export function isChooseAnyComboFulfillable(
  chooseCount: number,
  eligibleVariants: ComboEligibleVariant[],
  productsById: Map<string, ProductStockShape>,
): boolean {
  let capacity = 0;
  for (const ev of eligibleVariants) {
    capacity += remainingCapacity(productsById.get(ev.productId), ev.variantId);
    if (capacity >= chooseCount) return true;
  }
  return capacity >= chooseCount;
}

export function isComboFulfillable(
  combo: Pick<Combo, "type" | "items" | "chooseCount" | "eligibleVariants">,
  productsById: Map<string, ProductStockShape>,
): boolean {
  if (combo.type === "fixed") {
    return isFixedComboFulfillable(combo.items, productsById);
  }
  return isChooseAnyComboFulfillable(
    combo.chooseCount ?? 0,
    combo.eligibleVariants,
    productsById,
  );
}

/** Sum of the included/eligible variants' current prices, used for the
 * struck-through "original" price and savings badge — never for charging.
 * 'fixed': every item's price × qty. 'choose-any': the chooseCount MOST
 * EXPENSIVE eligible variants (a "best case regular price" so the savings
 * figure never understates what full price could have been). */
export function computeOriginalPriceInr(
  type: ComboType,
  items: ComboFixedItem[],
  chooseCount: number,
  eligibleVariants: ComboEligibleVariant[],
  productsById: Map<string, ProductStockShape>,
): number {
  function priceOf(productId: string, variantId: string): number {
    return livePriceForVariant(productsById.get(productId), variantId) ?? 0;
  }
  if (type === "fixed") {
    return items.reduce((sum, i) => sum + priceOf(i.productId, i.variantId) * i.qty, 0);
  }
  const prices = eligibleVariants
    .map((v) => priceOf(v.productId, v.variantId))
    .sort((a, b) => b - a);
  return prices.slice(0, chooseCount).reduce((sum, p) => sum + p, 0);
}

/** True if a combo is active and within its optional validFrom/validUntil
 * window right now — shared by the storefront's server-side query filter
 * and POS's client-side live feed. */
export function isComboCurrentlyValid(
  combo: Pick<Combo, "isActive" | "validFrom" | "validUntil">,
  now: Date = new Date(),
): boolean {
  if (!combo.isActive) return false;
  if (combo.validFrom && combo.validFrom.toDate() > now) return false;
  if (combo.validUntil && combo.validUntil.toDate() < now) return false;
  return true;
}

export function comboSavings(comboPriceInr: number, originalPriceInr: number) {
  const amount = Math.max(0, originalPriceInr - comboPriceInr);
  const percent = originalPriceInr > 0 ? Math.round((amount / originalPriceInr) * 100) : 0;
  return { amount, percent };
}

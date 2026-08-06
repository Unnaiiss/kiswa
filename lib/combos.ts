import type {
  Combo,
  ComboEligibleVariant,
  ComboFixedItem,
  ComboType,
  ProductDoc,
} from "@/lib/firestore/types";
import { maxAdditionalUnits } from "@/lib/pricing";

/** Only the fields these helpers actually need — both the server's
 * ProductDoc and the storefront's createdAt-stripped StoreProduct satisfy
 * this structurally, so callers on either side of the RSC boundary can pass
 * their own product map straight through. */
type ProductStockShape = Pick<ProductDoc, "isActive" | "oilStockMl" | "variants">;

/** True if every fixed component's product/variant is active and there's
 * enough oil for this combo's own bundle (aggregated per product, since two
 * components can share one product's pool). */
export function isFixedComboFulfillable(
  items: ComboFixedItem[],
  productsById: Map<string, ProductStockShape>,
): boolean {
  const mlNeededByProduct = new Map<string, number>();
  for (const item of items) {
    const product = productsById.get(item.productId);
    if (!product || !product.isActive) return false;
    const variant = product.variants.find((v) => v.variantId === item.variantId);
    if (!variant || !variant.isActive) return false;
    mlNeededByProduct.set(
      item.productId,
      (mlNeededByProduct.get(item.productId) ?? 0) + item.qty * variant.oilMlPerUnit,
    );
  }
  for (const [productId, mlNeeded] of mlNeededByProduct) {
    if (productsById.get(productId)!.oilStockMl < mlNeeded) return false;
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
    const product = productsById.get(ev.productId);
    if (!product || !product.isActive) continue;
    const variant = product.variants.find((v) => v.variantId === ev.variantId);
    if (!variant || !variant.isActive) continue;
    capacity += maxAdditionalUnits(product.oilStockMl, variant.oilMlPerUnit);
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
    const variant = productsById
      .get(productId)
      ?.variants.find((v) => v.variantId === variantId);
    return variant?.priceInr ?? 0;
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

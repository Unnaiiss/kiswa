import type { ProductVariant, VariantType } from "@/lib/firestore/types";

export interface VariantDefinition {
  variantId: string;
  type: VariantType;
  sizeMl: number;
  multiplier: number;
  /** Default ml of attar oil one unit of this variant consumes. */
  oilMlPerUnit: number;
}

export const VARIANT_DEFINITIONS: VariantDefinition[] = [
  { variantId: "oil-3ml", type: "oil", sizeMl: 3, multiplier: 1, oilMlPerUnit: 3 },
  { variantId: "oil-6ml", type: "oil", sizeMl: 6, multiplier: 1.8, oilMlPerUnit: 6 },
  { variantId: "oil-12ml", type: "oil", sizeMl: 12, multiplier: 3.2, oilMlPerUnit: 12 },
  { variantId: "spray-20ml", type: "spray", sizeMl: 20, multiplier: 1.4, oilMlPerUnit: 2.4 },
  { variantId: "spray-50ml", type: "spray", sizeMl: 50, multiplier: 2.8, oilMlPerUnit: 6 },
  { variantId: "spray-100ml", type: "spray", sizeMl: 100, multiplier: 4.5, oilMlPerUnit: 12 },
];

/** Fallback for a variant whose type/size isn't one of the six standard
 * slots above (e.g. a custom size added in the admin product editor). Oil
 * variants use the oil 1:1; sprays are diluted, so oil content is ~20% of
 * the bottle size — both are rough starting points, editable per variant. */
export function defaultOilMlPerUnit(type: VariantType, sizeMl: number): number {
  const known = VARIANT_DEFINITIONS.find(
    (d) => d.type === type && d.sizeMl === sizeMl,
  );
  if (known) return known.oilMlPerUnit;
  return type === "oil" ? sizeMl : Math.round(sizeMl * 0.2 * 10) / 10;
}

export function roundUpTo10(value: number): number {
  return Math.ceil(value / 10) * 10;
}

export interface ComputedVariantPrice {
  variantId: string;
  type: VariantType;
  sizeMl: number;
  priceInr: number;
  mrpInr: number;
  oilMlPerUnit: number;
}

export function computeVariantPrices(basePrice: number): ComputedVariantPrice[] {
  if (basePrice <= 0) {
    return VARIANT_DEFINITIONS.map((def) => ({
      variantId: def.variantId,
      type: def.type,
      sizeMl: def.sizeMl,
      priceInr: 0,
      mrpInr: 0,
      oilMlPerUnit: def.oilMlPerUnit,
    }));
  }

  return VARIANT_DEFINITIONS.map((def) => {
    const priceInr = roundUpTo10(basePrice * def.multiplier);
    const mrpInr = roundUpTo10(priceInr * 1.25);
    return {
      variantId: def.variantId,
      type: def.type,
      sizeMl: def.sizeMl,
      priceInr,
      mrpInr,
      oilMlPerUnit: def.oilMlPerUnit,
    };
  });
}

export function formatVariantLabel(type: VariantType, sizeMl: number): string {
  const label = type === "oil" ? "Oil" : "Spray";
  return `${label} ${sizeMl}ml`;
}

export function getStartingPrice(variants: ProductVariant[]): number {
  const active = variants.filter((v) => v.isActive);
  const pool = active.length > 0 ? active : variants;
  return Math.min(...pool.map((v) => v.priceInr));
}

export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

/** How many more units of a variant can be made from what's left of a
 * product's shared oil pool, after accounting for oil already committed to
 * other lines (other variants, or this same variant) in the same cart/bill. */
export function maxAdditionalUnits(
  remainingMl: number,
  oilMlPerUnit: number,
): number {
  if (oilMlPerUnit <= 0) return 0;
  return Math.max(0, Math.floor(remainingMl / oilMlPerUnit));
}


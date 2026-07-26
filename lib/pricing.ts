import type { VariantType } from "@/lib/firestore/types";

export interface VariantDefinition {
  variantId: string;
  type: VariantType;
  sizeMl: number;
  multiplier: number;
}

export const VARIANT_DEFINITIONS: VariantDefinition[] = [
  { variantId: "oil-3ml", type: "oil", sizeMl: 3, multiplier: 1 },
  { variantId: "oil-6ml", type: "oil", sizeMl: 6, multiplier: 1.8 },
  { variantId: "oil-12ml", type: "oil", sizeMl: 12, multiplier: 3.2 },
  { variantId: "spray-20ml", type: "spray", sizeMl: 20, multiplier: 1.4 },
  { variantId: "spray-50ml", type: "spray", sizeMl: 50, multiplier: 2.8 },
  { variantId: "spray-100ml", type: "spray", sizeMl: 100, multiplier: 4.5 },
];

export function roundUpTo10(value: number): number {
  return Math.ceil(value / 10) * 10;
}

export interface ComputedVariantPrice {
  variantId: string;
  type: VariantType;
  sizeMl: number;
  priceInr: number;
  mrpInr: number;
}

export function computeVariantPrices(basePrice: number): ComputedVariantPrice[] {
  if (basePrice <= 0) {
    return VARIANT_DEFINITIONS.map((def) => ({
      variantId: def.variantId,
      type: def.type,
      sizeMl: def.sizeMl,
      priceInr: 0,
      mrpInr: 0,
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
    };
  });
}

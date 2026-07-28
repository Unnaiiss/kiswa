import type { VariantType } from "@/lib/firestore/types";

export interface CartItem {
  productId: string;
  variantId: string;
  productName: string;
  slug: string;
  variantLabel: string;
  type: VariantType;
  sizeMl: number;
  unitPrice: number;
  /** ml of attar oil one unit of this variant consumes — carried on the
   * cart line so availability caps can be computed without re-fetching the
   * product (all variants of a product share one oil pool). */
  oilMlPerUnit: number;
  qty: number;
}

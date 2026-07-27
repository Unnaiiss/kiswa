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
  qty: number;
}

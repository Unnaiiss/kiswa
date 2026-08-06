import type { VariantType } from "@/lib/firestore/types";

export interface GiftDetails {
  recipientName: string;
  message: string;
  senderName: string;
  giftWrap: boolean;
}

export interface CartItem {
  /** Unique per cart line — lets two lines of the same productId+variantId
   * coexist (e.g. one gift-wrapped for a friend, one for yourself) instead
   * of merging. Regular (non-gift) lines still merge by productId+variantId
   * as before; see cart-provider's addItem. */
  lineId: string;
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
  /** Present only for gift lines. Gifting doesn't change stock/oil logic —
   * it's purely presentation/checkout metadata. */
  gift?: GiftDetails;
}

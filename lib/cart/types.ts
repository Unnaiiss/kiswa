import type { VariantType } from "@/lib/firestore/types";

export interface GiftDetails {
  recipientName: string;
  message: string;
  senderName: string;
  giftWrap: boolean;
}

/** One fragrance/variant inside a combo cart line — qty is per ONE combo
 * unit (the line's own `qty` multiplies it at checkout). */
export interface ComboCartComponent {
  productId: string;
  variantId: string;
  productName: string;
  variantLabel: string;
  qty: number;
}

export interface ComboCartDetails {
  comboId: string;
  comboTitle: string;
  /** Snapshot of the combo's own imageUrl, carried onto the cart line so the
   * bag can show a picture without re-fetching the combo. Null when the
   * combo has none. */
  imageUrl?: string | null;
  /** Display contents — combo.items for 'fixed', the customer's grouped
   * picks for 'choose-any'. */
  components: ComboCartComponent[];
  /** 'choose-any' only — the customer's flat picks (length === chooseCount,
   * repeats allowed), sent to checkout as-is; recordSale re-validates and
   * re-prices from the live combo doc regardless. Empty for 'fixed', which
   * is priced/expanded server-side from the combo doc's own items[]. */
  selections: { productId: string; variantId: string }[];
}

export interface CartItem {
  /** Unique per cart line — lets two lines of the same productId+variantId
   * coexist (e.g. one gift-wrapped for a friend, one for yourself) instead
   * of merging. Regular (non-gift, non-combo) lines still merge by
   * productId+variantId as before; see cart-provider's addItem. */
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
   * product (all variants of a product share one oil pool). Unused (0) for
   * combo lines — combo stock capping happens on the offers pages
   * (hide/disable unfulfillable combos) and authoritatively in recordSale,
   * not in the cart. */
  oilMlPerUnit: number;
  /** Snapshot of the product's (or combo's) primary image at the moment it
   * was added — avoids re-fetching product data just to render the bag.
   * Null/absent falls back to the monogram placeholder. */
  imageUrl?: string | null;
  qty: number;
  /** Present only for gift lines. Gifting doesn't change stock/oil logic —
   * it's purely presentation/checkout metadata. */
  gift?: GiftDetails;
  /** Present only for combo lines — productId/variantId/slug/variantLabel
   * above become placeholders (productId is the combo's id, variantId is
   * the literal "combo") since a combo isn't a single variant. */
  combo?: ComboCartDetails;
}

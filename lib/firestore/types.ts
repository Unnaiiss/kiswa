export interface TimestampLike {
  toDate(): Date;
  seconds: number;
  nanoseconds: number;
}

export type VariantType = "oil" | "spray";

export interface ProductVariant {
  variantId: string;
  type: VariantType;
  sizeMl: number;
  priceInr: number;
  mrpInr: number;
  /** ml of attar oil consumed to make one unit of this variant. All variants
   * of a product draw from that one product's oilStockMl pool. */
  oilMlPerUnit: number;
  /** Discontinued variants stay in the array (stock history refers to them by
   * variantId) but are hidden from sale everywhere until reactivated. */
  isActive: boolean;
}

export type ProductType = "attar" | "imported";

interface ProductBaseDoc {
  name: string;
  slug: string;
  description: string;
  notes: string[];
  category: string;
  imageUrls: string[];
  isActive: boolean;
  createdAt: TimestampLike;
}

/** Our own attar/perfume line, bottled to order from a shared bulk-oil pool —
 * every variant of a fragrance (every oil size AND every spray size) draws
 * from ONE oilStockMl, never its own independent count. */
export interface AttarProductDoc extends ProductBaseDoc {
  productType: "attar";
  variants: ProductVariant[];
  /** Bulk attar oil on hand for this fragrance, in ml (decimals allowed).
   * Every variant (oil or spray) is bottled from this single pool. */
  oilStockMl: number;
  lowStockThresholdMl: number;
}

/** A ready-made bottle bought in and resold as-is — ONE price, ONE size, no
 * attar oil pool at all. Stock is tracked in whole bottles (unitStock), via
 * the same stockIn/stockAdjust/recordSale transactions as attar products,
 * just unit-based instead of ml-based. */
export interface ImportedProductDoc extends ProductBaseDoc {
  productType: "imported";
  priceInr: number;
  mrpInr: number;
  /** Free text, e.g. "100ml EDP" — imported products have no oil/spray type
   * or admin-editable size list, just a label. */
  sizeLabel: string;
  brand: string | null;
  /** Whole bottles on hand. May ONLY be changed inside the
   * recordSale/stockIn/stockAdjust transactions, like oilStockMl. */
  unitStock: number;
  lowStockThresholdUnits: number;
  /** Admin opt-in to appear in the homepage "Imported Perfumes" section (see
   * getFeaturedImportedProducts) — most imported products are NOT featured by
   * default, unlike attar's featured rail which just shows the first N active
   * products. Imported products created before this field existed have it
   * missing in Firestore rather than false; every read site (the equality
   * query, the admin form's initial state) already treats missing the same
   * as false, so no backfill is needed. */
  featuredOnHome: boolean;
  /** Lower sorts first among featured imported products; ties/unset fall back
   * to newest first. Meaningless when featuredOnHome is false. */
  featuredOrder: number | null;
}

/** Shape as stored in Firestore (no doc id). */
export type ProductDoc = AttarProductDoc | ImportedProductDoc;

/** Hydrated with its Firestore document id, for app-wide use. */
export type Product = ProductDoc & { id: string };

export type StockMovementReason =
  | "opening_stock"
  | "purchase"
  | "online_sale"
  | "offline_sale"
  | "adjustment"
  | "return";

/** Whether a movement's mlChange is ml of attar oil (attar products) or
 * whole bottles (imported products). Missing on movements recorded before
 * this field existed — those are always "ml" (imported products didn't
 * exist yet), so callers should treat an absent unit as "ml". */
export type StockUnit = "ml" | "unit";

export interface StockMovementDoc {
  productId: string;
  productName: string;
  /** Set only for sale-driven line items of an ATTAR product (which variant
   * consumed the oil); null for product-level Stock In / Adjustment / Set
   * exact stock, and always null for imported products (which have no
   * variant entity — variantLabel carries the product's sizeLabel instead,
   * for context in the audit trail). */
  variantId: string | null;
  variantLabel: string | null;
  /** +/- quantity change, in `unit` (ml of attar oil, or whole imported
   * bottles) — e.g. -9 for a sale, +250 for a delivery. */
  mlChange: number;
  unit: StockUnit;
  reason: StockMovementReason;
  referenceId: string | null;
  note: string | null;
  createdAt: TimestampLike;
}

export interface StockMovement extends StockMovementDoc {
  id: string;
}

export type SaleChannel = "online" | "offline";
export type PaymentMethod = "razorpay" | "cash" | "upi" | "card";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type OrderStatus =
  | "pending"
  | "paid"
  | "packed"
  | "shipped"
  | "delivered"
  | "cancelled";

/** One fragrance/variant drawn from a combo, expanded and snapshotted at
 * sale time — qty and oilMlUsed are already totalled across the whole
 * combo line (i.e. per-combo-unit amount × the line's own qty), matching
 * how SaleItem.oilMlUsed is a fully-baked line total rather than a per-unit
 * figure. Lets reports attribute combo oil usage back to the underlying
 * fragrance instead of lumping it under the combo. */
export interface ComboSaleComponent {
  productId: string;
  productName: string;
  variantId: string;
  variantLabel: string;
  sizeMl: number;
  qty: number;
  oilMlUsed: number;
  /** Snapshotted from the component's product — lets oil-usage reports skip
   * imported components (always oilMlUsed 0, but still worth excluding from
   * the "oil consumed by product" table rather than showing a noisy 0ml
   * row). Absent on combos sold before this field existed (treat as attar,
   * since imported products didn't exist yet). */
  productType?: ProductType;
}

export interface SaleItem {
  productId: string;
  productName: string;
  variantId: string;
  sizeMl: number;
  unitPrice: number;
  qty: number;
  lineTotal: number;
  /** oilMlPerUnit * qty, snapshotted at sale time — oilMlPerUnit is editable
   * per variant, so historical reports must not rely on its current value.
   * Optional because sales recorded before the bulk-oil model shipped have
   * no such field; treat those as unknown (not zero-consumption) ml. Always
   * 0 for imported-product lines (they don't touch the oil pool at all), so
   * oil-usage reports stay attar-only without needing to filter this field
   * specially — it just never contributes. */
  oilMlUsed?: number;
  /** Snapshotted from the product at sale time — absent on sales recorded
   * before this field existed, which were always attar (treat missing as
   * "attar"). Combo lines leave this unset (a combo isn't itself one type;
   * see comboComponents for its per-fragrance breakdown). */
  productType?: ProductType;
  /** Imported-product lines only — snapshot of the product's sizeLabel
   * (e.g. "100ml EDP"), since variantId is just the "unit" placeholder and
   * sizeMl is 0 for these lines, unlike attar's real variant/size. */
  sizeLabel?: string | null;
  /** Gifting has no effect on stock/oil logic — these are purely
   * presentation/packing metadata carried alongside the line. */
  isGift?: boolean;
  giftRecipientName?: string | null;
  giftMessage?: string | null;
  giftSenderName?: string | null;
  giftWrap?: boolean;
  /** Set when this line is a combo bundle rather than a single variant —
   * productId/variantId/sizeMl above become placeholders (productId is the
   * combo's id, variantId is the literal "combo", sizeMl is 0) since a combo
   * has no single size; unitPrice/lineTotal are the fixed combo price
   * (never the sum of components), and comboComponents holds the expanded,
   * oil-accounted breakdown. */
  comboId?: string | null;
  comboTitle?: string | null;
  comboComponents?: ComboSaleComponent[] | null;
}

export interface ShippingAddress {
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

/** Used only for a gift's "deliver to a different address" option — unlike
 * the customer's own shippingAddress, this needs the recipient's own name
 * and phone since they won't match the paying customer. */
export interface GiftShippingAddress extends ShippingAddress {
  name: string;
  phone: string;
}

export interface SaleDoc {
  channel: SaleChannel;
  invoiceNo: string;
  customerName: string;
  customerPhone: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  orderStatus: OrderStatus;
  shippingAddress: ShippingAddress | null;
  createdByUid: string;
  createdAt: TimestampLike;
  /** Sum of items[].oilMlUsed, snapshotted at sale time. Optional for the
   * same reason as SaleItem.oilMlUsed — sales predating the bulk-oil model
   * don't have it. */
  totalOilMlUsed?: number;
  /** Set when any item is a gift and the customer chose "deliver to a
   * different address" at checkout — separate from shippingAddress, which
   * stays the billing/customer address. Null otherwise (online only). */
  giftShippingAddress?: GiftShippingAddress | null;
  /** "Hide prices in the package" checkbox from checkout — a packing
   * instruction for staff, not a technical price-hiding mechanism. */
  hidePrices?: boolean;
}

export interface Sale extends SaleDoc {
  id: string;
}

export type UserRole = "admin" | "staff";

export interface AppUserDoc {
  role: UserRole;
  name: string;
}

export interface AppUser extends AppUserDoc {
  uid: string;
}

export interface InvoiceCounter {
  year: number;
  seq: number;
}

/**
 * Bridges Razorpay order creation and payment verification. Created before
 * the customer pays (no stock touched yet); consumed by finalizeOnlineOrder
 * once the payment is verified (via redirect handler or webhook), which
 * calls recordSale to do the atomic stock check + decrement.
 */
export type PendingOrderStatus =
  | "created"
  | "processing"
  | "completed"
  | "refund_flagged";

export interface PendingOrderProductItem {
  kind: "product";
  productId: string;
  variantId: string;
  qty: number;
  isGift?: boolean;
  giftRecipientName?: string | null;
  giftMessage?: string | null;
  giftSenderName?: string | null;
  giftWrap?: boolean;
}

/** A combo line — comboId + qty is the intent; selections names the
 * customer's picks for a 'choose-any' combo (ignored server-side for
 * 'fixed' combos, which use the combo doc's own items[] instead). Price,
 * title, and component expansion are always re-derived from the live combo
 * doc inside recordSale's transaction, never trusted from the client. */
export interface PendingOrderComboItem {
  kind: "combo";
  comboId: string;
  qty: number;
  selections: { productId: string; variantId: string }[];
}

export type PendingOrderItem = PendingOrderProductItem | PendingOrderComboItem;

export interface PendingOrderDoc {
  items: PendingOrderItem[];
  customerName: string;
  customerPhone: string;
  shippingAddress: ShippingAddress;
  amountPaise: number;
  status: PendingOrderStatus;
  saleId: string | null;
  invoiceNo: string | null;
  createdAt: TimestampLike;
  giftShippingAddress?: GiftShippingAddress | null;
  hidePrices?: boolean;
}

export interface PendingOrder extends PendingOrderDoc {
  id: string;
}

/**
 * A payment Razorpay confirmed as captured, but recordSale's transactional
 * stock re-check rejected it (the variant sold out between order creation
 * and payment capture). Money was taken; stock was NOT decremented and no
 * sale was recorded. Surfaced in admin so staff can process a manual refund.
 */
export interface RefundFlagDoc {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  customerName: string;
  customerPhone: string;
  items: PendingOrderItem[];
  amountPaise: number;
  shippingAddress: ShippingAddress;
  reason: string;
  status: "pending" | "resolved";
  createdAt: TimestampLike;
}

export interface RefundFlag extends RefundFlagDoc {
  id: string;
}

export type BannerButtonPosition = "bottom-center" | "bottom-left" | "center";

export type BannerType = "image" | "combo";

interface BannerBaseDoc {
  order: number;
  isActive: boolean;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
}

/** The original poster-upload slide — a full-bleed image with an optional
 * clickable link and an optional CTA button overlay. Banners saved before
 * bannerType existed have no such field in Firestore; every read site
 * treats a missing/non-"combo" bannerType as "image". */
export interface ImageBannerDoc extends BannerBaseDoc {
  bannerType: "image";
  imageUrl: string;
  imageUrlMobile: string | null;
  altText: string;
  /** Internal path (e.g. "/shop") or full external URL. Null = not clickable. */
  linkUrl: string | null;
  /** A CTA button overlaid on the slide — independent of linkUrl (the whole
   * slide can link somewhere while the button points elsewhere, e.g. a combo
   * poster where the slide links to its own promo page but the button jumps
   * straight to /offers). Only rendered when buttonEnabled is true. */
  buttonEnabled: boolean;
  buttonLabel: string | null;
  buttonLink: string | null;
  buttonPosition: BannerButtonPosition;
}

/** A slide generated live from an existing combo's own data — no image
 * upload, no stored price; title/description/image/price/badge are all read
 * fresh from the combo doc at render time, so editing the combo in admin
 * updates the banner with no re-save. Hidden automatically (never rendered)
 * if the combo is inactive, outside its validFrom/validUntil window,
 * deleted, or currently unfulfillable from stock — see getActiveBanners. */
export interface ComboBannerDoc extends BannerBaseDoc {
  bannerType: "combo";
  comboId: string;
  /** Overrides the slide's headline; falls back to the combo's title when null. */
  headlineOverride: string | null;
  /** Overrides the CTA button label; falls back to "Shop This Combo" when null. */
  buttonLabelOverride: string | null;
}

/** Shape as stored in Firestore (no doc id). */
export type BannerDoc = ImageBannerDoc | ComboBannerDoc;

/** Hydrated with its Firestore document id, for app-wide use. */
export type Banner = BannerDoc & { id: string };

/**
 * Admin-editable homepage content blocks, keyed by a fixed doc id per
 * section (currently just "giftSection"). Publicly readable, like banners,
 * since it's non-sensitive marketing copy; writes go through
 * /api/admin/site-content/* (admin-only).
 */
export interface GiftSectionDoc {
  imageUrl: string;
  imageUrlMobile: string | null;
  heading: string;
  body: string;
  buttonLabel: string;
  updatedAt: TimestampLike;
}

export interface GiftSection extends GiftSectionDoc {
  id: string;
}

/**
 * Admin-editable images for the homepage "Our Story" section's two cards
 * (Perfume Oil / Perfume Spray). Each field is independently optional — the
 * storefront falls back to an icon treatment (matching ProductImage's
 * no-photo fallback) when unset, since this catalog has no real product
 * photography yet.
 */
export interface OurStorySectionDoc {
  oilCardImageUrl: string | null;
  oilCardImageUrlMobile: string | null;
  sprayCardImageUrl: string | null;
  sprayCardImageUrlMobile: string | null;
  updatedAt: TimestampLike;
}

export interface OurStorySection extends OurStorySectionDoc {
  id: string;
}

export type AnnouncementBarSpeed = "slow" | "normal" | "fast";

/**
 * Admin-editable header marquee — the running text strip above the main
 * nav. Same siteContent pattern as giftSection/ourStory: one fixed doc,
 * publicly readable, writes only via /api/admin/site-content/announcement-bar
 * (admin-only). messages[] are joined with a gold dot separator and looped
 * seamlessly on the storefront; an empty array (or isEnabled: false, or
 * outside validFrom/validUntil) means the bar renders nothing at all — see
 * lib/store/announcement.ts's isAnnouncementBarRenderable, the single place
 * that decides this so the storefront and admin "why is this hidden" checks
 * can never disagree.
 */
export interface AnnouncementBarDoc {
  isEnabled: boolean;
  messages: string[];
  backgroundColor: string;
  textColor: string;
  speed: AnnouncementBarSpeed;
  /** Internal path (e.g. "/shop") or full external URL. Null = not clickable. */
  linkUrl: string | null;
  validFrom: TimestampLike | null;
  validUntil: TimestampLike | null;
  updatedAt: TimestampLike;
}

export interface AnnouncementBar extends AnnouncementBarDoc {
  id: string;
}

/**
 * Admin-editable heading/subline + enable toggle for the homepage "Imported
 * Perfumes" section — same siteContent pattern as giftSection/ourStory/
 * announcementBar. The section's product list isn't stored here (it's
 * queried live via ImportedProductDoc.featuredOnHome/featuredOrder); this
 * doc only controls the copy and whether the section shows at all. Even
 * when isEnabled is true, the section still renders nothing if no featured
 * imported products are currently active/in stock — see
 * getFeaturedImportedProducts.
 */
export interface ImportedSectionDoc {
  isEnabled: boolean;
  heading: string;
  subline: string;
  updatedAt: TimestampLike;
}

export interface ImportedSection extends ImportedSectionDoc {
  id: string;
}

export type ComboType = "fixed" | "choose-any";

/** One fixed component of a 'fixed' combo — productName/variantLabel are
 * display snapshots for the admin list; recordSale always re-derives the
 * authoritative price/oil figures from the live product doc, never these. */
export interface ComboFixedItem {
  productId: string;
  variantId: string;
  productName: string;
  variantLabel: string;
  qty: number;
}

/** One variant eligible for a 'choose-any' combo's picker. */
export interface ComboEligibleVariant {
  productId: string;
  variantId: string;
  productName: string;
  variantLabel: string;
}

/** Admin-managed bundle offer. 'fixed' combos are a specific bundle of
 * variants at a set price; 'choose-any' combos let the customer pick
 * `chooseCount` variants (repeats allowed) from `eligibleVariants` for the
 * same fixed price. Only one of items/chooseCount+eligibleVariants is
 * populated depending on `type`. Public read of active combos; writes only
 * via /api/admin/combos/* (admin-only, firebase-admin). */
export interface ComboDoc {
  title: string;
  slug: string;
  description: string;
  imageUrl: string | null;
  imageUrlMobile: string | null;
  /** The fixed price charged for the whole bundle — never the sum of
   * component prices. */
  comboPriceInr: number;
  /** Sum of the included/eligible variants' regular prices, computed and
   * snapshotted at save time — used only for the struck-through "was"
   * price and savings badge, never for charging. */
  originalPriceInr: number;
  type: ComboType;
  /** 'fixed' only — the exact bundle contents. Empty for 'choose-any'. */
  items: ComboFixedItem[];
  /** 'choose-any' only — how many picks the customer must make. Null for 'fixed'. */
  chooseCount: number | null;
  /** 'choose-any' only — the pool the customer picks from. Empty for 'fixed'. */
  eligibleVariants: ComboEligibleVariant[];
  isActive: boolean;
  order: number;
  validFrom: TimestampLike | null;
  validUntil: TimestampLike | null;
  badgeText: string | null;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
}

export interface Combo extends ComboDoc {
  id: string;
}

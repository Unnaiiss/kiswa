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

/** Shape as stored in Firestore (no doc id). */
export interface ProductDoc {
  name: string;
  slug: string;
  description: string;
  notes: string[];
  category: string;
  imageUrls: string[];
  isActive: boolean;
  variants: ProductVariant[];
  /** Bulk attar oil on hand for this fragrance, in ml (decimals allowed).
   * Every variant (oil or spray) is bottled from this single pool. */
  oilStockMl: number;
  lowStockThresholdMl: number;
  createdAt: TimestampLike;
}

/** Hydrated with its Firestore document id, for app-wide use. */
export interface Product extends ProductDoc {
  id: string;
}

export type StockMovementReason =
  | "opening_stock"
  | "purchase"
  | "online_sale"
  | "offline_sale"
  | "adjustment"
  | "return";

export interface StockMovementDoc {
  productId: string;
  productName: string;
  /** Set only for sale-driven line items (which variant consumed the oil);
   * null for product-level Stock In / Adjustment / Set exact stock. */
  variantId: string | null;
  variantLabel: string | null;
  /** ml of attar oil, +/- (e.g. -9 for a sale, +250 for a delivery). */
  mlChange: number;
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
   * no such field; treat those as unknown (not zero-consumption) ml. */
  oilMlUsed?: number;
  /** Gifting has no effect on stock/oil logic — these are purely
   * presentation/packing metadata carried alongside the line. */
  isGift?: boolean;
  giftRecipientName?: string | null;
  giftMessage?: string | null;
  giftSenderName?: string | null;
  giftWrap?: boolean;
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

export interface PendingOrderItem {
  productId: string;
  variantId: string;
  qty: number;
  isGift?: boolean;
  giftRecipientName?: string | null;
  giftMessage?: string | null;
  giftSenderName?: string | null;
  giftWrap?: boolean;
}

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

/** Admin-managed homepage poster carousel slide. */
export interface BannerDoc {
  imageUrl: string;
  imageUrlMobile: string | null;
  altText: string;
  /** Internal path (e.g. "/shop") or full external URL. Null = not clickable. */
  linkUrl: string | null;
  order: number;
  isActive: boolean;
  createdAt: TimestampLike;
  updatedAt: TimestampLike;
}

export interface Banner extends BannerDoc {
  id: string;
}

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

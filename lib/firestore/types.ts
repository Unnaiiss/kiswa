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
  stock: number;
  lowStockThreshold: number;
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
  variantId: string;
  sizeMl: number;
  qtyChange: number;
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
}

export interface ShippingAddress {
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
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

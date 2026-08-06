import type { PaymentMethod, VariantType } from "@/lib/firestore/types";

export interface BillLine {
  productId: string;
  variantId: string;
  productName: string;
  type: VariantType;
  sizeMl: number;
  unitPrice: number;
  /** ml of attar oil one unit of this variant consumes — lets the bill
   * compute remaining availability without re-reading product data. */
  oilMlPerUnit: number;
  qty: number;
  /** Walk-in gift wrap toggle — no recipient/message/address at the counter,
   * just flags the line as a gift and asks for wrapping. */
  giftWrap?: boolean;
}

export type DiscountMode = "flat" | "percent";

/** Payment methods available at the physical counter (Razorpay is online-only). */
export type PosPaymentMethod = Extract<PaymentMethod, "cash" | "upi" | "card">;

export interface ReceiptData {
  invoiceNo: string;
  items: BillLine[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PosPaymentMethod;
  customerName: string;
  customerPhone: string;
  completedAt: Date;
}

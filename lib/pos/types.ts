import type { PaymentMethod, VariantType } from "@/lib/firestore/types";

export interface ComboBillComponent {
  productId: string;
  variantId: string;
  productName: string;
  variantLabel: string;
  qty: number;
}

export interface ComboBillDetails {
  comboId: string;
  comboTitle: string;
  components: ComboBillComponent[];
  /** 'choose-any' only — sent to /api/pos/sale as-is; empty for 'fixed'. */
  selections: { productId: string; variantId: string }[];
}

export interface BillLine {
  /** For combo lines, the combo's own id. */
  productId: string;
  /** For combo lines: "combo" for a 'fixed' bundle (identical every time, so
   * repeat taps just increment qty like any other line); for 'choose-any',
   * a hash of the chosen picks, so two different pick sets stay separate
   * lines while an identical repeat pick still increments in place. */
  variantId: string;
  productName: string;
  type: VariantType;
  sizeMl: number;
  unitPrice: number;
  /** ml of attar oil one unit of this variant consumes — lets the bill
   * compute remaining availability without re-reading product data. Unused
   * (0) for combo lines — combo stock capping isn't replicated in the bill
   * UI, only authoritatively enforced by recordSale at Complete Bill. */
  oilMlPerUnit: number;
  qty: number;
  /** Walk-in gift wrap toggle — no recipient/message/address at the counter,
   * just flags the line as a gift and asks for wrapping. */
  giftWrap?: boolean;
  /** Present only for combo lines. */
  combo?: ComboBillDetails;
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

"use client";

import Link from "next/link";
import { Download, Home } from "lucide-react";
import type { SaleDoc } from "@/lib/firestore/types";
import { formatInr } from "@/lib/pricing";
import { itemVariantLabel } from "@/lib/admin/salesAggregation";

interface OrderInvoiceProps {
  // createdAt, statusHistory, and shipping all carry real Firestore
  // Timestamp instances (statusHistory per-entry, shipping's dispatchDate/
  // expectedDeliveryDate) — not plain objects, so none can cross the
  // server/client boundary un-converted. This component doesn't render any
  // of them (delivery status has its own component — see
  // components/account/delivery-timeline.tsx), so callers should omit all
  // three rather than convert them; createdAt alone is passed separately
  // below, already converted to a plain Date, since this component does
  // render the order date.
  sale: Omit<SaleDoc, "createdAt" | "statusHistory" | "shipping">;
  createdAt: Date;
}

function formatDateTime(date: Date): string {
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OrderInvoice({ sale, createdAt }: OrderInvoiceProps) {
  return (
    <>
      <div
        id="order-invoice"
        className="mt-10 w-full rounded-lg border border-kiswa-border bg-kiswa-surface p-6 text-left"
      >
        <div className="flex items-start justify-between gap-4 border-b border-kiswa-border pb-4">
          <div>
            <p className="font-display text-lg text-kiswa-ink">KISWA</p>
            <p className="text-xs text-kiswa-ink-muted">Attar &amp; Perfume</p>
          </div>
          <div className="text-right text-xs text-kiswa-ink-muted">
            <p>Invoice {sale.invoiceNo}</p>
            <p>{formatDateTime(createdAt)}</p>
          </div>
        </div>

        <div className="mt-4 text-sm">
          <p className="text-kiswa-ink">{sale.customerName}</p>
          {sale.customerPhone && (
            <p className="text-kiswa-ink-muted">{sale.customerPhone}</p>
          )}
          {sale.shippingAddress && (
            <p className="mt-1 text-kiswa-ink-muted">
              {sale.shippingAddress.line1}
              {sale.shippingAddress.line2
                ? `, ${sale.shippingAddress.line2}`
                : ""}
              , {sale.shippingAddress.city}, {sale.shippingAddress.state} —{" "}
              {sale.shippingAddress.pincode}
            </p>
          )}
          {!sale.shippingAddress && sale.deliveryAddress && (
            <p className="mt-1 text-kiswa-ink-muted">
              {sale.deliveryAddress.line1}
              {sale.deliveryAddress.line2 ? `, ${sale.deliveryAddress.line2}` : ""},{" "}
              {sale.deliveryAddress.city}, {sale.deliveryAddress.district},{" "}
              {sale.deliveryAddress.state} — {sale.deliveryAddress.pincode}
            </p>
          )}
        </div>

        <ul className="mt-5 flex flex-col gap-3 border-t border-kiswa-border pt-4">
          {sale.items.map((item, idx) => (
            <li
              key={`${item.productId}-${item.variantId}-${idx}`}
              className="flex justify-between gap-4 text-sm"
            >
              <div>
                <p className="text-kiswa-ink">{item.productName}</p>
                {item.comboComponents && item.comboComponents.length > 0 ? (
                  <p className="text-kiswa-ink-muted">
                    {item.comboComponents
                      .map((c) => `${c.variantLabel}${c.qty > 1 ? ` ×${c.qty}` : ""}`)
                      .join(", ")}{" "}
                    × {item.qty}
                  </p>
                ) : (
                  <p className="text-kiswa-ink-muted">
                    {itemVariantLabel(item)} × {item.qty}
                  </p>
                )}
              </div>
              <p className="shrink-0 text-kiswa-ink">
                {formatInr(item.lineTotal)}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-col gap-1 border-t border-kiswa-border pt-4 text-sm">
          <div className="flex justify-between text-kiswa-ink-muted">
            <span>Subtotal</span>
            <span>{formatInr(sale.subtotal)}</span>
          </div>
          {sale.discount > 0 && (
            <div className="flex justify-between text-kiswa-ink-muted">
              <span>Discount</span>
              <span>-{formatInr(sale.discount)}</span>
            </div>
          )}
          <div className="mt-1 flex justify-between font-display text-lg text-kiswa-ink">
            <span>Total paid</span>
            <span className="text-kiswa-gold">{formatInr(sale.total)}</span>
          </div>
          <div className="flex justify-between text-xs text-kiswa-ink-muted">
            <span>Payment method</span>
            <span className="uppercase">{sale.paymentMethod}</span>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-kiswa-ink-muted">
          Thank you for shopping with KISWA!
        </p>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="flex cursor-pointer items-center gap-2 rounded-full border border-kiswa-border px-5 py-2.5 text-sm font-medium tracking-wide text-kiswa-ink transition-colors hover:border-kiswa-gold"
        >
          <Download size={16} />
          Download bill
        </button>
        <Link
          href="/shop"
          className="cursor-pointer text-sm font-medium tracking-wide text-kiswa-gold underline underline-offset-4 hover:text-kiswa-gold-soft"
        >
          Continue shopping
        </Link>
        <Link
          href="/"
          className="flex cursor-pointer items-center gap-1.5 text-sm font-medium tracking-wide text-kiswa-ink-muted underline underline-offset-4 hover:text-kiswa-ink"
        >
          <Home size={14} />
          Return to home
        </Link>
      </div>
    </>
  );
}

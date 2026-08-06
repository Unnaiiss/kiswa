"use client";

import { useState } from "react";
import Link from "next/link";
import { Gift, Package, Printer } from "lucide-react";
import { Modal } from "@/components/admin/modal";
import { adminFetch } from "@/lib/admin/apiClient";
import { itemVariantLabel, saleHasCombo, saleHasGift } from "@/lib/admin/salesAggregation";
import { formatInr } from "@/lib/pricing";
import type { OrderStatus, Sale } from "@/lib/firestore/types";

const STATUS_OPTIONS: OrderStatus[] = [
  "pending",
  "paid",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
];

export function SaleDetail({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  const [status, setStatus] = useState<OrderStatus>(sale.orderStatus);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const giftItems = sale.items.filter((item) => item.isGift);
  const comboItems = sale.items.filter((item) => item.comboId);

  async function handleUpdateStatus() {
    setSubmitting(true);
    setError(null);
    try {
      await adminFetch(`/api/admin/sales/${sale.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ orderStatus: status }),
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Invoice ${sale.invoiceNo}`} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-zinc-500 uppercase">Customer</p>
            <p className="text-zinc-50">{sale.customerName}</p>
            <p className="text-zinc-400">{sale.customerPhone}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase">Date</p>
            <p className="text-zinc-50">
              {sale.createdAt.toDate().toLocaleString("en-IN")}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase">Channel</p>
            <p className="text-zinc-50 capitalize">{sale.channel}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase">Payment</p>
            <p className="text-zinc-50 capitalize">
              {sale.paymentMethod} · {sale.paymentStatus}
            </p>
          </div>
        </div>

        {sale.shippingAddress && (
          <div className="text-sm">
            <p className="text-xs text-zinc-500 uppercase">Shipping address</p>
            <p className="text-zinc-300">
              {sale.shippingAddress.line1}
              {sale.shippingAddress.line2 ? `, ${sale.shippingAddress.line2}` : ""},{" "}
              {sale.shippingAddress.city}, {sale.shippingAddress.state} —{" "}
              {sale.shippingAddress.pincode}
            </p>
          </div>
        )}

        <div className="rounded-lg border border-zinc-800">
          <ul className="divide-y divide-zinc-800">
            {sale.items.map((item, idx) => (
              <li
                key={`${item.productId}-${item.variantId}-${idx}`}
                className="flex justify-between gap-3 px-3 py-2.5 text-sm"
              >
                <div>
                  <p className="flex items-center gap-1.5 text-zinc-50">
                    {item.comboId && <Package size={13} className="text-sky-400" />}
                    {item.productName}
                    {item.isGift && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-amber-400 uppercase">
                        <Gift size={10} />
                        Gift
                      </span>
                    )}
                  </p>
                  {item.comboComponents && item.comboComponents.length > 0 ? (
                    <p className="text-zinc-500">
                      {item.comboComponents
                        .map((c) => `${c.variantLabel}${c.qty > 1 ? ` ×${c.qty}` : ""}`)
                        .join(", ")}{" "}
                      × {item.qty}
                    </p>
                  ) : (
                    <p className="text-zinc-500">
                      {itemVariantLabel(item)} × {item.qty}
                    </p>
                  )}
                </div>
                <p className="shrink-0 font-medium text-zinc-50">
                  {formatInr(item.lineTotal)}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between text-zinc-400">
            <span>Subtotal</span>
            <span>{formatInr(sale.subtotal)}</span>
          </div>
          {sale.discount > 0 && (
            <div className="flex justify-between text-zinc-400">
              <span>Discount</span>
              <span>-{formatInr(sale.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-semibold text-zinc-50">
            <span>Total</span>
            <span>{formatInr(sale.total)}</span>
          </div>
        </div>

        {saleHasCombo(sale) && (
          <div className="rounded-lg border-l-4 border-sky-400 bg-sky-400/5 p-4">
            <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-sky-400 uppercase">
              <Package size={13} />
              Combo details
            </p>
            <div className="flex flex-col gap-3">
              {comboItems.map((item, idx) => (
                <div key={`${item.comboId}-${idx}`} className="text-sm">
                  <p className="font-medium text-zinc-50">
                    {item.comboTitle} × {item.qty}
                  </p>
                  <ul className="mt-1 text-zinc-400">
                    {(item.comboComponents ?? []).map((c, cIdx) => (
                      <li key={`${c.productId}-${c.variantId}-${cIdx}`}>
                        {c.productName} — {c.variantLabel}
                        {c.qty > 1 ? ` ×${c.qty}` : ""} ({c.oilMlUsed}ml oil)
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {saleHasGift(sale) && (
          <div className="rounded-lg border-l-4 border-amber-400 bg-amber-400/5 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-amber-400 uppercase">
                <Gift size={13} />
                Gift details
              </p>
              <Link
                href={`/admin/sales/${sale.id}/gift-card`}
                target="_blank"
                className="flex cursor-pointer items-center gap-1.5 text-xs text-zinc-300 underline underline-offset-2 hover:text-amber-400"
              >
                <Printer size={12} />
                Print gift card
              </Link>
            </div>

            <div className="flex flex-col gap-3">
              {giftItems.map((item, idx) => (
                <div key={`${item.variantId}-${idx}`} className="text-sm">
                  <p className="font-medium text-zinc-50">
                    {item.productName} — {itemVariantLabel(item)}
                  </p>
                  <p className="text-zinc-400">
                    For <span className="text-zinc-200">{item.giftRecipientName || "—"}</span>
                    {item.giftSenderName ? ` · From ${item.giftSenderName}` : ""}
                  </p>
                  {item.giftMessage && (
                    <p className="mt-1 rounded-md bg-zinc-900 p-2 text-zinc-300 italic">
                      &ldquo;{item.giftMessage}&rdquo;
                    </p>
                  )}
                  <p className="mt-1 text-xs text-zinc-500">
                    {item.giftWrap ? "Gift wrap requested" : "No gift wrap"}
                  </p>
                </div>
              ))}

              <div className="border-t border-amber-400/20 pt-3 text-sm">
                <p className="text-zinc-400">
                  {sale.hidePrices
                    ? "Hide prices in the package: yes"
                    : "Hide prices in the package: no"}
                </p>
                {sale.giftShippingAddress && (
                  <div className="mt-2">
                    <p className="text-xs text-zinc-500 uppercase">
                      Gift delivery address
                    </p>
                    <p className="text-zinc-300">
                      {sale.giftShippingAddress.name} ·{" "}
                      {sale.giftShippingAddress.phone}
                    </p>
                    <p className="text-zinc-300">
                      {sale.giftShippingAddress.line1}
                      {sale.giftShippingAddress.line2
                        ? `, ${sale.giftShippingAddress.line2}`
                        : ""}
                      , {sale.giftShippingAddress.city}, {sale.giftShippingAddress.state}{" "}
                      — {sale.giftShippingAddress.pincode}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {sale.channel === "online" && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
            <p className="mb-2 text-xs text-zinc-500 uppercase">Order status</p>
            <div className="flex gap-2">
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as OrderStatus);
                  setSaved(false);
                }}
                className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 outline-none focus:border-amber-400"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt} className="capitalize">
                    {opt}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleUpdateStatus}
                disabled={submitting || status === sale.orderStatus}
                className="cursor-pointer rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-300 disabled:opacity-40"
              >
                {submitting ? "Saving…" : "Update"}
              </button>
            </div>
            {saved && (
              <p className="mt-2 text-xs text-green-400">Status updated.</p>
            )}
            {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          </div>
        )}
      </div>
    </Modal>
  );
}

"use client";

import { useState } from "react";
import { Gift, Printer } from "lucide-react";
import type { Sale } from "@/lib/firestore/types";
import { itemVariantLabel } from "@/lib/admin/salesAggregation";

type PrintSize = "a4" | "thermal";

function AddressBlock({ sale }: { sale: Sale }) {
  const addr = sale.deliveryAddress ?? sale.shippingAddress;
  if (!addr) return <p className="text-sm text-zinc-500 print:text-black">No delivery address on file — pickup/counter order.</p>;

  const isDelivery = "district" in addr;
  return (
    <div className="text-sm">
      <p className="font-medium">{sale.customerName}</p>
      <p>{"phone" in addr && addr.phone ? addr.phone : sale.customerPhone}</p>
      <p>
        {addr.line1}
        {addr.line2 ? `, ${addr.line2}` : ""}, {addr.city}
        {isDelivery ? `, ${addr.district}` : ""}, {addr.state} — {addr.pincode}
      </p>
    </div>
  );
}

function ItemsList({ sale, compact }: { sale: Sale; compact: boolean }) {
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-black/30">
          <th className={compact ? "py-1" : "py-2"}>Item</th>
          <th className={`${compact ? "py-1" : "py-2"} text-right`}>Qty</th>
        </tr>
      </thead>
      <tbody>
        {sale.items.map((item, idx) => (
          <tr key={`${item.productId}-${item.variantId}-${idx}`} className="border-b border-black/10">
            <td className={compact ? "py-1" : "py-2"}>
              <span className="flex items-center gap-1.5">
                {item.productName}
                {item.isGift && <Gift size={compact ? 10 : 12} />}
              </span>
              {item.comboComponents && item.comboComponents.length > 0 ? (
                <span className="block text-xs text-zinc-600">
                  {item.comboComponents.map((c) => `${c.productName} — ${c.variantLabel}${c.qty > 1 ? ` ×${c.qty}` : ""}`).join(", ")}
                </span>
              ) : (
                <span className="block text-xs text-zinc-600">{itemVariantLabel(item)}</span>
              )}
              {item.isGift && (
                <span className="block text-xs text-zinc-600">
                  Gift for {item.giftRecipientName || "—"}
                  {item.giftWrap ? " · Gift wrap" : ""}
                </span>
              )}
            </td>
            <td className={`${compact ? "py-1" : "py-2"} text-right font-medium`}>{item.qty}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SlipContent({ sale, compact }: { sale: Sale; compact: boolean }) {
  return (
    <>
      <div className="flex items-start justify-between gap-4 border-b border-black/30 pb-3">
        <div>
          <p className="font-display text-lg font-semibold">KISWA</p>
          <p className="text-xs">Packing Slip</p>
        </div>
        <div className="text-right text-xs">
          <p>{sale.invoiceNo}</p>
          <p>{sale.createdAt.toDate().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase">Deliver to</p>
        <div className="mt-1">
          <AddressBlock sale={sale} />
        </div>
      </div>

      <div className="mt-4">
        <ItemsList sale={sale} compact={compact} />
      </div>

      <div className="mt-4 border-t border-black/30 pt-2 text-sm font-medium">
        {sale.items.reduce((n, i) => n + i.qty, 0)} item{sale.items.reduce((n, i) => n + i.qty, 0) === 1 ? "" : "s"} total
      </div>

      {sale.hidePrices && (
        <p className="mt-3 rounded border border-black/30 p-2 text-xs font-semibold">
          ⚠ HIDE PRICES IN THE PACKAGE — do not include invoice/price slip
        </p>
      )}
      {sale.giftShippingAddress && (
        <p className="mt-2 text-xs">Gift — ships to a different address than the billing address above.</p>
      )}
    </>
  );
}

export function PackingSlip({ sale }: { sale: Sale }) {
  const [size, setSize] = useState<PrintSize>("a4");

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 py-8">
      <div className="flex items-center gap-3 print:hidden">
        <div className="flex rounded-lg border border-zinc-800 p-1">
          {(["a4", "thermal"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-sm capitalize transition-colors ${
                size === s ? "bg-amber-400 text-zinc-950" : "text-zinc-400 hover:text-zinc-50"
              }`}
            >
              {s === "a4" ? "A4" : "Thermal (80mm)"}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex cursor-pointer items-center gap-2 rounded-lg bg-amber-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-300"
        >
          <Printer size={16} />
          Print
        </button>
      </div>

      <div className="w-full rounded-xl border border-zinc-800 bg-white p-6 text-black print:hidden">
        <SlipContent sale={sale} compact={false} />
      </div>

      {size === "a4" ? (
        <div id="packing-slip-a4" className="hidden print:block">
          <SlipContent sale={sale} compact={false} />
        </div>
      ) : (
        <div id="packing-slip-thermal" className="hidden print:block font-mono">
          <SlipContent sale={sale} compact />
        </div>
      )}
    </div>
  );
}

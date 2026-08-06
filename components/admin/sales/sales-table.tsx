"use client";

import { Gift, Package } from "lucide-react";
import type { Sale } from "@/lib/firestore/types";
import { saleHasCombo, saleHasGift } from "@/lib/admin/salesAggregation";
import { formatInr } from "@/lib/pricing";

const CHANNEL_LABEL: Record<Sale["channel"], string> = {
  online: "Online",
  offline: "POS",
};

const STATUS_STYLE: Record<Sale["orderStatus"], string> = {
  pending: "bg-zinc-800 text-zinc-400",
  paid: "bg-sky-500/10 text-sky-400",
  packed: "bg-amber-500/10 text-amber-400",
  shipped: "bg-purple-500/10 text-purple-400",
  delivered: "bg-green-500/10 text-green-400",
  cancelled: "bg-red-500/10 text-red-400",
};

export function SalesTable({
  sales,
  loading,
  onSelect,
}: {
  sales: Sale[];
  loading: boolean;
  onSelect: (sale: Sale) => void;
}) {
  if (loading) return <p className="text-sm text-zinc-500">Loading sales…</p>;
  if (sales.length === 0) return <p className="text-sm text-zinc-500">No sales match these filters.</p>;

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-zinc-800 bg-zinc-900 text-xs tracking-wide text-zinc-500 uppercase">
          <tr>
            <th className="px-4 py-3">Invoice</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Channel</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Items</th>
            <th className="px-4 py-3">Total</th>
            <th className="px-4 py-3">Payment</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((sale) => (
            <tr
              key={sale.id}
              onClick={() => onSelect(sale)}
              className="cursor-pointer border-b border-zinc-900 last:border-none hover:bg-zinc-900/50"
            >
              <td className="px-4 py-2.5 font-medium text-amber-400">
                <span className="flex items-center gap-1.5">
                  {sale.invoiceNo}
                  {saleHasGift(sale) && (
                    <span className="flex items-center gap-1 rounded-full bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-amber-400 uppercase">
                      <Gift size={10} />
                      Gift
                    </span>
                  )}
                  {saleHasCombo(sale) && (
                    <span className="flex items-center gap-1 rounded-full bg-sky-400/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-sky-400 uppercase">
                      <Package size={10} />
                      Combo
                    </span>
                  )}
                </span>
              </td>
              <td className="px-4 py-2.5 text-zinc-400">
                {sale.createdAt.toDate().toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
              <td className="px-4 py-2.5 text-zinc-300">{CHANNEL_LABEL[sale.channel]}</td>
              <td className="px-4 py-2.5 text-zinc-300">{sale.customerName}</td>
              <td className="px-4 py-2.5 text-zinc-500">
                {sale.items.reduce((n, i) => n + i.qty, 0)} item
                {sale.items.reduce((n, i) => n + i.qty, 0) === 1 ? "" : "s"}
              </td>
              <td className="px-4 py-2.5 font-semibold text-zinc-50">
                {formatInr(sale.total)}
              </td>
              <td className="px-4 py-2.5 text-zinc-400 capitalize">{sale.paymentMethod}</td>
              <td className="px-4 py-2.5">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs capitalize ${STATUS_STYLE[sale.orderStatus]}`}
                >
                  {sale.orderStatus}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

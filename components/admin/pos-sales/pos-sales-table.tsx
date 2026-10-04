"use client";

import { Gift, Package } from "lucide-react";
import type { OrderStatus, Sale } from "@/lib/firestore/types";
import { posStaffLabel, saleHasCombo, saleHasGift } from "@/lib/admin/salesAggregation";
import { normalizeOrderStatus, ORDER_STATUS_LABELS } from "@/lib/orderFulfillment";
import { formatInr } from "@/lib/pricing";
import {
  MobileRowCard,
  MobileRowCardList,
  MobileRowField,
  MobileRowHeader,
} from "@/components/admin/mobile-row-card";

const STATUS_STYLE: Record<OrderStatus, string> = {
  pending: "bg-zinc-800 text-zinc-400",
  confirmed: "bg-sky-500/10 text-sky-400",
  packed: "bg-amber-500/10 text-amber-400",
  shipped: "bg-purple-500/10 text-purple-400",
  out_for_delivery: "bg-indigo-500/10 text-indigo-400",
  delivered: "bg-green-500/10 text-green-400",
  cancelled: "bg-red-500/10 text-red-400",
  returned: "bg-orange-500/10 text-orange-400",
};

export function PosSalesTable({
  sales,
  loading,
  onSelect,
  selectedIds,
  onToggleSelect,
}: {
  sales: Sale[];
  loading: boolean;
  onSelect: (sale: Sale) => void;
  selectedIds: Set<string>;
  onToggleSelect: (saleId: string) => void;
}) {
  if (loading) return <p className="text-sm text-zinc-500">Loading sales…</p>;
  if (sales.length === 0) return <p className="text-sm text-zinc-500">No POS sales match these filters.</p>;

  return (
    <>
    <MobileRowCardList>
      {sales.map((sale) => {
        const status = normalizeOrderStatus(sale.orderStatus);
        return (
          <MobileRowCard key={sale.id} onClick={() => onSelect(sale)} selected={selectedIds.has(sale.id)}>
            <MobileRowHeader>
              <span className="flex min-w-0 items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedIds.has(sale.id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    onToggleSelect(sale.id);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="size-4 shrink-0 cursor-pointer rounded border-zinc-700 bg-canvas accent-amber-400"
                />
                <span className="truncate font-medium text-amber-400">{sale.invoiceNo}</span>
              </span>
              <span className="shrink-0 font-semibold text-zinc-50">{formatInr(sale.total)}</span>
            </MobileRowHeader>
            {(saleHasGift(sale) || saleHasCombo(sale)) && (
              <div className="flex flex-wrap gap-1.5">
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
              </div>
            )}
            <MobileRowField label="Customer">{sale.customerName}</MobileRowField>
            <MobileRowField label="Staff">{posStaffLabel(sale)}</MobileRowField>
            <MobileRowField label="Date">
              {sale.createdAt.toDate().toLocaleString("en-IN", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </MobileRowField>
            <MobileRowField label="Items">
              {sale.items.reduce((n, i) => n + i.qty, 0)} item
              {sale.items.reduce((n, i) => n + i.qty, 0) === 1 ? "" : "s"}
            </MobileRowField>
            <MobileRowField label="Payment">
              <span className="capitalize">{sale.paymentMethod}</span>
            </MobileRowField>
            <MobileRowField label="Status">
              <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLE[status]}`}>
                {ORDER_STATUS_LABELS[status]}
              </span>
            </MobileRowField>
          </MobileRowCard>
        );
      })}
    </MobileRowCardList>

    <div className="hidden overflow-x-auto rounded-xl border border-zinc-800 sm:block">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-zinc-800 bg-zinc-900 text-xs tracking-wide text-zinc-500 uppercase">
          <tr>
            <th className="w-10 px-4 py-3" />
            <th className="px-4 py-3">Invoice</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Staff</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Items</th>
            <th className="px-4 py-3">Total</th>
            <th className="px-4 py-3">Payment</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((sale) => {
            const status = normalizeOrderStatus(sale.orderStatus);
            return (
              <tr
                key={sale.id}
                className="border-b border-zinc-900 last:border-none hover:bg-zinc-900/50"
              >
                <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(sale.id)}
                    onChange={() => onToggleSelect(sale.id)}
                    className="size-4 cursor-pointer rounded border-zinc-700 bg-canvas accent-amber-400"
                  />
                </td>
                <td className="cursor-pointer px-4 py-2.5 font-medium text-amber-400" onClick={() => onSelect(sale)}>
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
                <td className="cursor-pointer px-4 py-2.5 text-zinc-400" onClick={() => onSelect(sale)}>
                  {sale.createdAt.toDate().toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="cursor-pointer px-4 py-2.5 text-zinc-300" onClick={() => onSelect(sale)}>
                  {posStaffLabel(sale)}
                </td>
                <td className="cursor-pointer px-4 py-2.5 text-zinc-300" onClick={() => onSelect(sale)}>
                  {sale.customerName}
                </td>
                <td className="cursor-pointer px-4 py-2.5 text-zinc-500" onClick={() => onSelect(sale)}>
                  {sale.items.reduce((n, i) => n + i.qty, 0)} item
                  {sale.items.reduce((n, i) => n + i.qty, 0) === 1 ? "" : "s"}
                </td>
                <td className="cursor-pointer px-4 py-2.5 font-semibold text-zinc-50" onClick={() => onSelect(sale)}>
                  {formatInr(sale.total)}
                </td>
                <td className="cursor-pointer px-4 py-2.5 text-zinc-400 capitalize" onClick={() => onSelect(sale)}>
                  {sale.paymentMethod}
                </td>
                <td className="cursor-pointer px-4 py-2.5" onClick={() => onSelect(sale)}>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLE[status]}`}>
                    {ORDER_STATUS_LABELS[status]}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    </>
  );
}

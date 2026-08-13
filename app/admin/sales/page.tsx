"use client";

import { useMemo, useState } from "react";
import { useSalesInRange } from "@/lib/admin/useSalesInRange";
import { daysAgo, dayKey, saleHasGift } from "@/lib/admin/salesAggregation";
import {
  normalizeOrderStatus,
  nextValidStatuses,
  ORDER_STATUS_LABELS,
} from "@/lib/orderFulfillment";
import { adminFetch } from "@/lib/admin/apiClient";
import { SalesTable } from "@/components/admin/sales/sales-table";
import { SaleDetail } from "@/components/admin/sales/sale-detail";
import type { OrderStatus, PaymentMethod, SaleChannel } from "@/lib/firestore/types";

const inputClass =
  "rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 outline-none focus:border-amber-400";

const ALL_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "returned",
];

export default function AdminSalesPage() {
  const [fromStr, setFromStr] = useState(dayKey(daysAgo(new Date(), 29)));
  const [toStr, setToStr] = useState(dayKey(new Date()));
  const [channel, setChannel] = useState<SaleChannel | "all">("all");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "all">("all");
  const [orderStatus, setOrderStatus] = useState<OrderStatus | "all">("all");
  const [giftOnly, setGiftOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTarget, setBulkTarget] = useState<OrderStatus | "">("");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ succeeded: number; failed: { saleId: string; error: string }[] } | null>(null);

  const from = useMemo(() => new Date(`${fromStr}T00:00:00`), [fromStr]);
  const to = useMemo(() => new Date(`${toStr}T23:59:59.999`), [toStr]);

  const { sales, loading } = useSalesInRange(from, to);

  const filtered = useMemo(
    () =>
      sales.filter((sale) => {
        if (channel !== "all" && sale.channel !== channel) return false;
        if (paymentMethod !== "all" && sale.paymentMethod !== paymentMethod) return false;
        if (orderStatus !== "all" && normalizeOrderStatus(sale.orderStatus) !== orderStatus) return false;
        if (giftOnly && !saleHasGift(sale)) return false;
        return true;
      }),
    [sales, channel, paymentMethod, orderStatus, giftOnly],
  );

  // Live-derived from `sales` (not a snapshotted copy) so the modal reflects
  // a status/shipping update the moment it lands, without needing to close
  // and reopen it.
  const selected = selectedId ? (sales.find((s) => s.id === selectedId) ?? null) : null;

  // Only offer bulk statuses valid for EVERY selected order — the API would
  // still handle a mixed batch gracefully (partial success), but this keeps
  // the picker from offering something guaranteed to fail for some of the
  // selection.
  const selectedSales = filtered.filter((s) => selectedIds.has(s.id));
  const bulkOptions = useMemo(() => {
    if (selectedSales.length === 0) return [];
    return ALL_STATUSES.filter((status) =>
      selectedSales.every((s) => nextValidStatuses(normalizeOrderStatus(s.orderStatus)).includes(status)),
    );
  }, [selectedSales]);

  function toggleSelect(saleId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(saleId)) next.delete(saleId);
      else next.add(saleId);
      return next;
    });
    setBulkResult(null);
  }

  async function applyBulk() {
    if (!bulkTarget || selectedIds.size === 0) return;
    setBulkSubmitting(true);
    setBulkResult(null);
    try {
      const data = await adminFetch<{ succeeded: string[]; failed: { saleId: string; error: string }[] }>(
        "/api/admin/sales/bulk-status",
        {
          method: "POST",
          body: JSON.stringify({ saleIds: [...selectedIds], newStatus: bulkTarget }),
        },
      );
      setBulkResult({ succeeded: data.succeeded.length, failed: data.failed });
      setSelectedIds(new Set());
      setBulkTarget("");
    } catch (err) {
      setBulkResult({ succeeded: 0, failed: [{ saleId: "", error: err instanceof Error ? err.message : "Something went wrong." }] });
    } finally {
      setBulkSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-50">Sales &amp; Fulfillment</h1>
        <p className="mt-1 text-sm text-zinc-500">
          All sales across both channels, {filtered.length} shown.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="date"
          value={fromStr}
          max={toStr}
          onChange={(e) => setFromStr(e.target.value)}
          className={inputClass}
        />
        <span className="text-zinc-500">to</span>
        <input
          type="date"
          value={toStr}
          min={fromStr}
          onChange={(e) => setToStr(e.target.value)}
          className={inputClass}
        />
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value as SaleChannel | "all")}
          className={inputClass}
        >
          <option value="all">All channels</option>
          <option value="online">Online</option>
          <option value="offline">Offline (POS)</option>
        </select>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod | "all")}
          className={inputClass}
        >
          <option value="all">All payment methods</option>
          <option value="razorpay">Razorpay</option>
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="card">Card</option>
        </select>
        <select
          value={orderStatus}
          onChange={(e) => setOrderStatus(e.target.value as OrderStatus | "all")}
          className={inputClass}
        >
          <option value="all">All statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={giftOnly}
            onChange={(e) => setGiftOnly(e.target.checked)}
            className="size-4 rounded border-zinc-700 bg-zinc-950 accent-amber-400"
          />
          Gift orders only
        </label>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-400/30 bg-amber-400/5 px-4 py-3">
          <p className="text-sm text-amber-300">
            {selectedIds.size} order{selectedIds.size === 1 ? "" : "s"} selected
          </p>
          <select
            value={bulkTarget}
            onChange={(e) => setBulkTarget(e.target.value as OrderStatus | "")}
            className={inputClass}
            disabled={bulkOptions.length === 0}
          >
            <option value="">
              {bulkOptions.length === 0 ? "No status valid for all selected" : "Advance to…"}
            </option>
            {bulkOptions.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={applyBulk}
            disabled={!bulkTarget || bulkSubmitting}
            className="cursor-pointer rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-300 disabled:opacity-40"
          >
            {bulkSubmitting ? "Applying…" : "Apply"}
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="cursor-pointer text-sm text-zinc-400 hover:text-zinc-50"
          >
            Clear selection
          </button>
        </div>
      )}

      {bulkResult && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm">
          <p className="text-green-400">{bulkResult.succeeded} order(s) updated.</p>
          {bulkResult.failed.length > 0 && (
            <ul className="mt-1 text-red-400">
              {bulkResult.failed.map((f, idx) => (
                <li key={idx}>
                  {f.saleId ? `${f.saleId}: ` : ""}
                  {f.error}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <SalesTable
        sales={filtered}
        loading={loading}
        onSelect={(sale) => setSelectedId(sale.id)}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
      />

      {selected && <SaleDetail sale={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

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
import { PosSalesTable, posStaffLabel } from "@/components/admin/pos-sales/pos-sales-table";
import { SaleDetail } from "@/components/admin/sales/sale-detail";
import { StatCard } from "@/components/admin/dashboard/stat-card";
import { QueryErrorBanner } from "@/components/admin/query-error-banner";
import { formatInr } from "@/lib/pricing";
import type { OrderStatus, PaymentMethod } from "@/lib/firestore/types";

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

export default function AdminPosSalesPage() {
  const [fromStr, setFromStr] = useState(dayKey(daysAgo(new Date(), 29)));
  const [toStr, setToStr] = useState(dayKey(new Date()));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "all">("all");
  const [staff, setStaff] = useState("all");
  const [giftOnly, setGiftOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTarget, setBulkTarget] = useState<OrderStatus | "">("");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ succeeded: number; failed: { saleId: string; error: string }[] } | null>(null);

  const from = useMemo(() => new Date(`${fromStr}T00:00:00`), [fromStr]);
  const to = useMemo(() => new Date(`${toStr}T23:59:59.999`), [toStr]);

  const { sales: allSales, loading, error } = useSalesInRange(from, to);

  // This screen is POS (in-store) sales only — every online channel is
  // already covered by Admin > Sales, which also offers an "Offline (POS)"
  // channel filter; this page exists for staff/till-focused browsing that
  // filter doesn't give you (a Staff column/filter, a per-staff summary).
  const posSales = useMemo(() => allSales.filter((s) => s.channel === "offline"), [allSales]);

  const staffNames = useMemo(() => {
    const names = new Set(posSales.map((s) => posStaffLabel(s)));
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [posSales]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return posSales.filter((sale) => {
      if (paymentMethod !== "all" && sale.paymentMethod !== paymentMethod) return false;
      if (staff !== "all" && posStaffLabel(sale) !== staff) return false;
      if (giftOnly && !saleHasGift(sale)) return false;
      if (
        term &&
        !sale.customerName.toLowerCase().includes(term) &&
        !sale.customerPhone.toLowerCase().includes(term) &&
        !sale.invoiceNo.toLowerCase().includes(term)
      ) {
        return false;
      }
      return true;
    });
  }, [posSales, paymentMethod, staff, giftOnly, search]);

  const selected = selectedId ? (posSales.find((s) => s.id === selectedId) ?? null) : null;

  const totals = useMemo(() => {
    const revenue = filtered.reduce((sum, s) => sum + s.total, 0);
    const returned = filtered.filter((s) => normalizeOrderStatus(s.orderStatus) === "returned");
    return {
      revenue,
      count: filtered.length,
      returnedCount: returned.length,
      returnedRevenue: returned.reduce((sum, s) => sum + s.total, 0),
    };
  }, [filtered]);

  const byStaff = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number }>();
    for (const sale of filtered) {
      const name = posStaffLabel(sale);
      const entry = map.get(name) ?? { count: 0, revenue: 0 };
      entry.count += 1;
      entry.revenue += sale.total;
      map.set(name, entry);
    }
    return [...map.entries()].sort((a, b) => b[1].revenue - a[1].revenue);
  }, [filtered]);

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
        <h1 className="text-2xl font-semibold text-zinc-50">POS Sales</h1>
        <p className="mt-1 text-sm text-zinc-500">
          In-store counter sales only — {filtered.length} shown. For online orders too, use Sales.
        </p>
      </div>

      {error && <QueryErrorBanner error={error} />}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Revenue" revenue={totals.revenue} count={totals.count} accent="amber" />
        <StatCard
          label="Returns"
          revenue={totals.returnedRevenue}
          count={totals.returnedCount}
        />
      </div>

      {byStaff.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900 text-xs tracking-wide text-zinc-500 uppercase">
              <tr>
                <th className="px-4 py-2.5">Staff</th>
                <th className="px-4 py-2.5">Bills</th>
                <th className="px-4 py-2.5">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {byStaff.map(([name, stats]) => (
                <tr key={name} className="border-b border-zinc-900 last:border-none">
                  <td className="px-4 py-2 text-zinc-300">{name}</td>
                  <td className="px-4 py-2 text-zinc-400">{stats.count}</td>
                  <td className="px-4 py-2 font-medium text-zinc-50">{formatInr(stats.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, phone, or invoice…"
          className={`${inputClass} min-w-[16rem]`}
        />
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
          value={staff}
          onChange={(e) => setStaff(e.target.value)}
          className={inputClass}
        >
          <option value="all">All staff</option>
          {staffNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod | "all")}
          className={inputClass}
        >
          <option value="all">All payment methods</option>
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="card">Card</option>
        </select>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={giftOnly}
            onChange={(e) => setGiftOnly(e.target.checked)}
            className="size-4 rounded border-zinc-700 bg-canvas accent-amber-400"
          />
          Gift orders only
        </label>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-400/30 bg-amber-400/5 px-4 py-3">
          <p className="text-sm text-amber-300">
            {selectedIds.size} bill{selectedIds.size === 1 ? "" : "s"} selected
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
          <p className="text-green-400">{bulkResult.succeeded} bill(s) updated.</p>
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

      <PosSalesTable
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

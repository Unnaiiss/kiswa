"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { useSalesInRange } from "@/lib/admin/useSalesInRange";
import { useSaleMovementsInRange } from "@/lib/admin/useSaleMovementsInRange";
import {
  channelSplit,
  daysAgo,
  dayKey,
  giftOrdersCount,
  mlConsumedByChannel,
  oilSprayRevenueSplit,
  oilUsageBreakdown,
  totalItemsSold,
  totalMlConsumed,
  totalRevenue,
} from "@/lib/admin/salesAggregation";
import { downloadCsv, salesToCsv } from "@/lib/admin/csv";
import { StatCard } from "@/components/admin/dashboard/stat-card";
import { SplitBar } from "@/components/admin/reports/split-bar";

const inputClass =
  "rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 outline-none focus:border-amber-400";

function formatMl(value: number): string {
  return `${Number(value.toFixed(1))} ml`;
}

export default function AdminReportsPage() {
  const [fromStr, setFromStr] = useState(dayKey(daysAgo(new Date(), 29)));
  const [toStr, setToStr] = useState(dayKey(new Date()));

  const from = useMemo(() => new Date(`${fromStr}T00:00:00`), [fromStr]);
  const to = useMemo(() => new Date(`${toStr}T23:59:59.999`), [toStr]);

  const { sales, loading } = useSalesInRange(from, to, 5000);
  const { movementsBySaleId, loading: movementsLoading } =
    useSaleMovementsInRange(from, to, 5000);

  const revenue = useMemo(() => totalRevenue(sales), [sales]);
  const itemsSold = useMemo(() => totalItemsSold(sales), [sales]);
  const channels = useMemo(() => channelSplit(sales), [sales]);
  const oilSpray = useMemo(() => oilSprayRevenueSplit(sales), [sales]);
  const mlConsumed = useMemo(
    () => totalMlConsumed(sales, movementsBySaleId),
    [sales, movementsBySaleId],
  );
  const mlByChannel = useMemo(
    () => mlConsumedByChannel(sales, movementsBySaleId),
    [sales, movementsBySaleId],
  );
  const oilUsage = useMemo(
    () => oilUsageBreakdown(sales, movementsBySaleId),
    [sales, movementsBySaleId],
  );
  const giftOrders = useMemo(() => giftOrdersCount(sales), [sales]);

  function handleExport() {
    const csv = salesToCsv(sales);
    downloadCsv(csv, `kiswa-sales_${fromStr}_to_${toStr}.csv`);
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-50">Reports</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Revenue and sales breakdown for a date range.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={sales.length === 0}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:border-amber-400 hover:text-amber-400 disabled:opacity-40"
        >
          <Download size={16} />
          Export CSV
        </button>
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
      </div>

      {loading || movementsLoading ? (
        <p className="text-sm text-zinc-500">Loading report…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Revenue" revenue={revenue} accent="amber" />
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                Bills
              </p>
              <p className="mt-2 text-2xl font-bold text-zinc-50">{sales.length}</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                Items sold
              </p>
              <p className="mt-2 text-2xl font-bold text-zinc-50">{itemsSold}</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                Oil consumed
              </p>
              <p className="mt-2 text-2xl font-bold text-zinc-50">
                {formatMl(mlConsumed)}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                Gift orders
              </p>
              <p className="mt-2 text-2xl font-bold text-zinc-50">{giftOrders}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SplitBar
              title="Channel split (revenue)"
              segments={[
                { label: "Online", value: channels.online.revenue, color: "bg-amber-400" },
                { label: "Offline (POS)", value: channels.offline.revenue, color: "bg-sky-400" },
              ]}
            />
            <SplitBar
              title="Oil vs Spray revenue"
              segments={[
                { label: "Oil", value: oilSpray.oil, color: "bg-emerald-400" },
                { label: "Spray", value: oilSpray.spray, color: "bg-purple-400" },
              ]}
            />
          </div>

          <SplitBar
            title="Oil used (ml) by channel"
            formatValue={formatMl}
            segments={[
              { label: "Online", value: mlByChannel.online, color: "bg-amber-400" },
              { label: "Offline (POS)", value: mlByChannel.offline, color: "bg-sky-400" },
            ]}
          />

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="mb-4 text-sm font-semibold text-zinc-50">
              Oil consumed by product
            </h2>
            {oilUsage.length === 0 ? (
              <p className="text-sm text-zinc-500">No sales in this range.</p>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500">
                      <th className="py-2 pr-3 font-medium">Product</th>
                      <th className="py-2 pr-3 font-medium">Variant</th>
                      <th className="py-2 pr-3 text-right font-medium">Units sold</th>
                      <th className="py-2 text-right font-medium">Oil used (ml)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {oilUsage.map((row) => (
                      <tr key={`${row.productName} ${row.variantLabel}`}>
                        <td className="py-2 pr-3 text-zinc-300">{row.productName}</td>
                        <td className="py-2 pr-3 text-zinc-500">{row.variantLabel}</td>
                        <td className="py-2 pr-3 text-right text-zinc-300">
                          {row.unitsSold}
                        </td>
                        <td className="py-2 text-right font-medium text-zinc-50">
                          {formatMl(row.oilMlUsed)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

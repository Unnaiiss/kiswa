"use client";

import { useDashboardData } from "@/lib/admin/useDashboardData";
import { StatCard } from "@/components/admin/dashboard/stat-card";
import { SalesChart } from "@/components/admin/dashboard/sales-chart";
import { OrdersNeedingActionPanel } from "@/components/admin/dashboard/orders-needing-action-panel";
import { PaymentModeIndicator } from "@/components/admin/payment-mode-indicator";
import {
  LowStockPanel,
  RefundFlagsPanel,
  TopVariantsPanel,
} from "@/components/admin/dashboard/side-panels";

function formatMl(value: number): string {
  return `${Number(value.toFixed(1))} ml`;
}

export default function AdminDashboardPage() {
  const { loading, today, month, chartData, top5, lowStockAlerts } =
    useDashboardData();

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-50">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Live revenue, stock, and sales across both channels.
        </p>
      </div>

      <PaymentModeIndicator compact />
      <RefundFlagsPanel />
      <OrdersNeedingActionPanel />

      {loading ? (
        <p className="text-sm text-zinc-500">Loading dashboard…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label="Today — Online"
              revenue={today.online.revenue}
              count={today.online.count}
              accent="amber"
            />
            <StatCard
              label="Today — Offline"
              revenue={today.offline.revenue}
              count={today.offline.count}
            />
            <StatCard
              label="This month"
              revenue={month.revenue}
              count={month.count}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                Oil used — Today
              </p>
              <p className="mt-2 text-2xl font-bold text-zinc-50">
                {formatMl(today.oilMl)}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                Oil used — This month
              </p>
              <p className="mt-2 text-2xl font-bold text-zinc-50">
                {formatMl(month.oilMl)}
              </p>
            </div>
          </div>

          <SalesChart data={chartData} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TopVariantsPanel items={top5} />
            <LowStockPanel alerts={lowStockAlerts} />
          </div>
        </>
      )}
    </div>
  );
}

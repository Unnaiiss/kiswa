"use client";

import { useDashboardData } from "@/lib/admin/useDashboardData";
import { StatCard } from "@/components/admin/dashboard/stat-card";
import { SalesChart } from "@/components/admin/dashboard/sales-chart";
import {
  LowStockPanel,
  RefundFlagsPanel,
  TopVariantsPanel,
} from "@/components/admin/dashboard/side-panels";

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

      <RefundFlagsPanel />

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

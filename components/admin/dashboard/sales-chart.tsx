"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyChannelPoint } from "@/lib/admin/salesAggregation";
import { formatInr } from "@/lib/pricing";

function formatDateTick(value: string) {
  // Parse as local Y/M/D — `new Date("YYYY-MM-DD")` parses as UTC midnight,
  // which can roll back to the previous local day in timezones behind UTC.
  const [year, month, day] = value.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function SalesChart({ data }: { data: DailyChannelPoint[] }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-50">
          Last 30 days — Online vs Offline
        </h2>
        <div className="flex items-center gap-4 text-xs text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-amber-400" /> Online
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-sky-400" /> Offline
          </span>
        </div>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateTick}
              stroke="#71717a"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              minTickGap={24}
            />
            <YAxis
              stroke="#71717a"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatInr(v)}
              width={64}
            />
            <Tooltip
              contentStyle={{
                background: "#18181b",
                border: "1px solid #27272a",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelFormatter={(value) => formatDateTick(String(value))}
              formatter={(value, name) => [
                formatInr(Number(value)),
                name === "online" ? "Online" : "Offline",
              ]}
            />
            <Line
              type="monotone"
              dataKey="online"
              stroke="#fbbf24"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="offline"
              stroke="#38bdf8"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

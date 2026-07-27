import type { Sale, SaleItem, VariantType } from "@/lib/firestore/types";
import { formatVariantLabel } from "@/lib/pricing";

/** Variant IDs are always `${type}-${sizeMl}ml` (see lib/pricing.ts), so the
 * type can be recovered without a product lookup — sale items don't store it. */
export function parseVariantType(variantId: string): VariantType {
  return variantId.startsWith("oil") ? "oil" : "spray";
}

export function itemVariantLabel(item: SaleItem): string {
  return formatVariantLabel(parseVariantType(item.variantId), item.sizeMl);
}

/** Local-calendar-day key (not UTC) — must match the local-time arithmetic in
 * startOfDay/startOfMonth/daysAgo below, or every bucket ends up one day off
 * for any timezone ahead of UTC (e.g. IST), silently dropping today's sales. */
export function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function daysAgo(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function saleDate(sale: Sale): Date {
  return sale.createdAt.toDate();
}

export interface DailyChannelPoint {
  date: string;
  online: number;
  offline: number;
}

/** One point per day for the trailing `days` days (inclusive of today), zero-filled. */
export function buildDailySeries(sales: Sale[], days: number): DailyChannelPoint[] {
  const points = new Map<string, DailyChannelPoint>();
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const key = dayKey(daysAgo(today, i));
    points.set(key, { date: key, online: 0, offline: 0 });
  }

  for (const sale of sales) {
    const key = dayKey(saleDate(sale));
    const point = points.get(key);
    if (!point) continue;
    if (sale.channel === "online") point.online += sale.total;
    else point.offline += sale.total;
  }

  return [...points.values()];
}

export interface TopVariantEntry {
  label: string;
  qty: number;
  revenue: number;
}

export function topVariants(sales: Sale[], topN = 5): TopVariantEntry[] {
  const byLabel = new Map<string, TopVariantEntry>();
  for (const sale of sales) {
    for (const item of sale.items) {
      const label = `${item.productName} — ${itemVariantLabel(item)}`;
      const entry = byLabel.get(label) ?? { label, qty: 0, revenue: 0 };
      entry.qty += item.qty;
      entry.revenue += item.lineTotal;
      byLabel.set(label, entry);
    }
  }
  return [...byLabel.values()].sort((a, b) => b.qty - a.qty).slice(0, topN);
}

export interface ChannelStats {
  revenue: number;
  count: number;
}

export function channelSplit(sales: Sale[]): Record<"online" | "offline", ChannelStats> {
  const split: Record<"online" | "offline", ChannelStats> = {
    online: { revenue: 0, count: 0 },
    offline: { revenue: 0, count: 0 },
  };
  for (const sale of sales) {
    split[sale.channel].revenue += sale.total;
    split[sale.channel].count += 1;
  }
  return split;
}

export function oilSprayRevenueSplit(sales: Sale[]): { oil: number; spray: number } {
  const split = { oil: 0, spray: 0 };
  for (const sale of sales) {
    for (const item of sale.items) {
      split[parseVariantType(item.variantId)] += item.lineTotal;
    }
  }
  return split;
}

export function totalItemsSold(sales: Sale[]): number {
  return sales.reduce(
    (sum, sale) => sum + sale.items.reduce((n, item) => n + item.qty, 0),
    0,
  );
}

export function totalRevenue(sales: Sale[]): number {
  return sales.reduce((sum, sale) => sum + sale.total, 0);
}

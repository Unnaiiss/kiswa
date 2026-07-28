"use client";

import { useMemo } from "react";
import { useSalesInRange } from "./useSalesInRange";
import { useSaleMovementsInRange } from "./useSaleMovementsInRange";
import { useAllProducts } from "./useAllProducts";
import {
  buildDailySeries,
  channelSplit,
  startOfDay,
  startOfMonth,
  daysAgo,
  topVariants,
  totalItemsSold,
  totalMlConsumed,
  totalRevenue,
  type DailyChannelPoint,
  type TopVariantEntry,
} from "./salesAggregation";
import type { Product } from "@/lib/firestore/types";

export interface LowStockAlert {
  productId: string;
  productName: string;
  stockMl: number;
  thresholdMl: number;
}

export interface DashboardData {
  loading: boolean;
  today: {
    online: { revenue: number; count: number };
    offline: { revenue: number; count: number };
    oilMl: number;
  };
  month: { revenue: number; count: number; itemsSold: number; oilMl: number };
  chartData: DailyChannelPoint[];
  top5: TopVariantEntry[];
  lowStockAlerts: LowStockAlert[];
}

const CHART_WINDOW_DAYS = 30;

export function useDashboardData(): DashboardData {
  const now = useMemo(() => new Date(), []);
  const monthStart = useMemo(() => startOfMonth(now), [now]);
  const chartStart = useMemo(() => daysAgo(now, CHART_WINDOW_DAYS - 1), [now]);
  // Query from whichever cutoff is earlier so both "this month" and the
  // trailing 30-day chart are fully covered by one listener.
  const queryStart = monthStart < chartStart ? monthStart : chartStart;

  const { sales, loading: salesLoading } = useSalesInRange(queryStart, now);
  const { products, loading: productsLoading } = useAllProducts();
  const { movementsBySaleId, loading: movementsLoading } =
    useSaleMovementsInRange(queryStart, now);

  const today = useMemo(() => {
    const todayStart = startOfDay(now);
    const todaySales = sales.filter((s) => s.createdAt.toDate() >= todayStart);
    const split = channelSplit(todaySales);
    return {
      online: { revenue: split.online.revenue, count: split.online.count },
      offline: { revenue: split.offline.revenue, count: split.offline.count },
      oilMl: totalMlConsumed(todaySales, movementsBySaleId),
    };
  }, [sales, now, movementsBySaleId]);

  const month = useMemo(() => {
    const monthSales = sales.filter((s) => s.createdAt.toDate() >= monthStart);
    return {
      revenue: totalRevenue(monthSales),
      count: monthSales.length,
      itemsSold: totalItemsSold(monthSales),
      oilMl: totalMlConsumed(monthSales, movementsBySaleId),
    };
  }, [sales, monthStart, movementsBySaleId]);

  const chartData = useMemo(() => {
    const chartSales = sales.filter((s) => s.createdAt.toDate() >= chartStart);
    return buildDailySeries(chartSales, CHART_WINDOW_DAYS);
  }, [sales, chartStart]);

  const top5 = useMemo(() => {
    const chartSales = sales.filter((s) => s.createdAt.toDate() >= chartStart);
    return topVariants(chartSales, 5);
  }, [sales, chartStart]);

  const lowStockAlerts = useMemo(
    () => buildLowStockAlerts(products),
    [products],
  );

  return {
    loading: salesLoading || productsLoading || movementsLoading,
    today,
    month,
    chartData,
    top5,
    lowStockAlerts,
  };
}

function buildLowStockAlerts(products: Product[]): LowStockAlert[] {
  const alerts: LowStockAlert[] = [];
  for (const product of products) {
    if (!product.isActive) continue;
    if (product.oilStockMl <= product.lowStockThresholdMl) {
      alerts.push({
        productId: product.id,
        productName: product.name,
        stockMl: product.oilStockMl,
        thresholdMl: product.lowStockThresholdMl,
      });
    }
  }
  return alerts.sort((a, b) => a.stockMl - b.stockMl);
}

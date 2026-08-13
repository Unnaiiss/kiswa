import type { PaymentMethod, Sale, SaleItem, StockMovement, VariantType } from "@/lib/firestore/types";
import { formatVariantLabel } from "@/lib/pricing";

/** Sale-driven stock movements for a date range, grouped by the sale
 * (referenceId) they belong to — see useSaleMovementsInRange. Used only as
 * a fallback for sales recorded before oilMlUsed/totalOilMlUsed existed. */
export type MovementsBySaleId = Map<string, StockMovement[]>;

/** Variant IDs are always `${type}-${sizeMl}ml` (see lib/pricing.ts), so the
 * type can be recovered without a product lookup — sale items don't store it. */
export function parseVariantType(variantId: string): VariantType {
  return variantId.startsWith("oil") ? "oil" : "spray";
}

export function itemVariantLabel(item: SaleItem): string {
  if (item.productType === "imported") {
    return item.sizeLabel ?? "Imported";
  }
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

/** Combo lines aren't a single variant, so they're excluded here (their
 * component oil usage still shows up via oilUsageBreakdown below) — see
 * comboUnitsSold for the combo-specific equivalent of this table. Imported
 * lines are also excluded — parseVariantType only makes sense for attar
 * variantIds, and "top variants" is inherently an attar concept (imported
 * has one size, so it'd just repeat the product itself). */
export function topVariants(sales: Sale[], topN = 5): TopVariantEntry[] {
  const byLabel = new Map<string, TopVariantEntry>();
  for (const sale of sales) {
    for (const item of sale.items) {
      if (item.comboId || item.productType === "imported") continue;
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

/** Combo revenue isn't split here since a bundle can mix oil and spray
 * components — see comboRevenue for its own total instead. Imported revenue
 * isn't oil/spray at all — see revenueByProductType for its own split. */
export function oilSprayRevenueSplit(sales: Sale[]): { oil: number; spray: number } {
  const split = { oil: 0, spray: 0 };
  for (const sale of sales) {
    for (const item of sale.items) {
      if (item.comboId || item.productType === "imported") continue;
      split[parseVariantType(item.variantId)] += item.lineTotal;
    }
  }
  return split;
}

export interface ProductTypeStats {
  revenue: number;
  unitsSold: number;
}

/** Revenue and units sold split three ways: attar, imported, and combo
 * (a combo can mix either/both underlying types, so it gets its own
 * bucket rather than being force-fit into one). Sales recorded before
 * productType existed are always attar (imported products didn't exist
 * yet). */
export function revenueByProductType(
  sales: Sale[],
): Record<"attar" | "imported" | "combo", ProductTypeStats> {
  const stats: Record<"attar" | "imported" | "combo", ProductTypeStats> = {
    attar: { revenue: 0, unitsSold: 0 },
    imported: { revenue: 0, unitsSold: 0 },
    combo: { revenue: 0, unitsSold: 0 },
  };
  for (const sale of sales) {
    for (const item of sale.items) {
      const bucket = item.comboId ? "combo" : item.productType === "imported" ? "imported" : "attar";
      stats[bucket].revenue += item.lineTotal;
      stats[bucket].unitsSold += item.qty;
    }
  }
  return stats;
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

export function saleHasGift(sale: Sale): boolean {
  return sale.items.some((item) => item.isGift);
}

export function giftOrdersCount(sales: Sale[]): number {
  return sales.filter(saleHasGift).length;
}

export function saleHasCombo(sale: Sale): boolean {
  return sale.items.some((item) => item.comboId);
}

/** Total revenue from combo lines (comboPriceInr × qty), across all sales. */
export function comboRevenue(sales: Sale[]): number {
  return sales.reduce(
    (sum, sale) =>
      sum +
      sale.items
        .filter((item) => item.comboId)
        .reduce((lineSum, item) => lineSum + item.lineTotal, 0),
    0,
  );
}

export interface ComboSalesRow {
  comboTitle: string;
  unitsSold: number;
  revenue: number;
}

/** Units sold and revenue per combo, for the Reports "combo offers" table. */
export function comboUnitsSold(sales: Sale[]): ComboSalesRow[] {
  const byTitle = new Map<string, ComboSalesRow>();
  for (const sale of sales) {
    for (const item of sale.items) {
      if (!item.comboId) continue;
      const key = item.comboTitle ?? item.comboId;
      const row = byTitle.get(key) ?? { comboTitle: key, unitsSold: 0, revenue: 0 };
      row.unitsSold += item.qty;
      row.revenue += item.lineTotal;
      byTitle.set(key, row);
    }
  }
  return [...byTitle.values()].sort((a, b) => b.revenue - a.revenue);
}

interface EffectiveOilLine {
  productName: string;
  variantLabel: string;
  qty: number;
  oilMl: number;
}

function saleHasOilSnapshot(sale: Sale): boolean {
  return (
    typeof sale.totalOilMlUsed === "number" &&
    sale.items.every((item) => typeof item.oilMlUsed === "number")
  );
}

/** One line of oil usage per item in this sale — read from the sale's own
 * snapshot in the normal case. oilMlPerUnit is editable per variant, so
 * historical reports must not recompute from its current value.
 *
 * For sales recorded before the bulk-oil model shipped (no snapshot),
 * falls back to that sale's own stockMovements. Only already ml-shaped
 * movements (mlChange) count — movements from the old per-variant-bottle
 * model recorded unit counts (qtyChange), which can't become ml without a
 * product lookup; that conversion is what the one-time backfill script
 * does instead, so this fallback should rarely find anything left to do. */
function effectiveOilLines(
  sale: Sale,
  movementsBySaleId: MovementsBySaleId,
): EffectiveOilLine[] {
  if (saleHasOilSnapshot(sale)) {
    // Combo lines expand into their components — each fragrance's oil usage
    // is attributed to that fragrance, not lumped under the combo's own
    // "productName" (which isn't a real product). Imported lines/components
    // are skipped entirely — they never touch the oil pool (always 0ml),
    // and a 0ml row would just be noise in an oil-usage table.
    return sale.items.flatMap((item) => {
      if (item.comboComponents && item.comboComponents.length > 0) {
        return item.comboComponents
          .filter((c) => c.productType !== "imported")
          .map((c) => ({
            productName: c.productName,
            variantLabel: c.variantLabel,
            qty: c.qty,
            oilMl: c.oilMlUsed,
          }));
      }
      if (item.productType === "imported") return [];
      return [
        {
          productName: item.productName,
          variantLabel: itemVariantLabel(item),
          qty: item.qty,
          oilMl: item.oilMlUsed ?? 0,
        },
      ];
    });
  }
  const movements = movementsBySaleId.get(sale.id) ?? [];
  return movements
    .filter((m) => typeof m.mlChange === "number")
    .map((m) => ({
      productName: m.productName,
      variantLabel: m.variantLabel ?? "—",
      qty: 0,
      oilMl: Math.abs(m.mlChange),
    }));
}

/** Total ml of attar oil consumed across all items in these sales. See
 * effectiveOilLines for how sales missing the oilMlUsed snapshot are
 * handled. movementsBySaleId is only needed for that fallback. */
export function totalMlConsumed(
  sales: Sale[],
  movementsBySaleId: MovementsBySaleId = new Map(),
): number {
  return sales.reduce(
    (sum, sale) =>
      sum +
      effectiveOilLines(sale, movementsBySaleId).reduce(
        (n, line) => n + line.oilMl,
        0,
      ),
    0,
  );
}

/** Ml of attar oil consumed, split by sale channel. */
export function mlConsumedByChannel(
  sales: Sale[],
  movementsBySaleId: MovementsBySaleId = new Map(),
): Record<"online" | "offline", number> {
  const split = { online: 0, offline: 0 };
  for (const sale of sales) {
    const ml = effectiveOilLines(sale, movementsBySaleId).reduce(
      (n, line) => n + line.oilMl,
      0,
    );
    split[sale.channel] += ml;
  }
  return split;
}

export interface OilUsageRow {
  productName: string;
  variantLabel: string;
  unitsSold: number;
  oilMlUsed: number;
}

/** Per (product, variant) breakdown — units sold and oil ml used — for the
 * Reports "oil consumed by product" table. */
export function oilUsageBreakdown(
  sales: Sale[],
  movementsBySaleId: MovementsBySaleId = new Map(),
): OilUsageRow[] {
  const byKey = new Map<string, OilUsageRow>();
  for (const sale of sales) {
    for (const line of effectiveOilLines(sale, movementsBySaleId)) {
      const key = `${line.productName} ${line.variantLabel}`;
      const row = byKey.get(key) ?? {
        productName: line.productName,
        variantLabel: line.variantLabel,
        unitsSold: 0,
        oilMlUsed: 0,
      };
      row.unitsSold += line.qty;
      row.oilMlUsed += line.oilMl;
      byKey.set(key, row);
    }
  }
  return [...byKey.values()].sort(
    (a, b) =>
      a.productName.localeCompare(b.productName) ||
      a.variantLabel.localeCompare(b.variantLabel),
  );
}

/** Revenue and order count per PaymentMethod, for the Reports "payment
 * method split" table. Sales predating 'cod' can never carry that value, so
 * every bucket present in PaymentMethod is safe to seed at zero. */
export function paymentMethodSplit(sales: Sale[]): Record<PaymentMethod, ChannelStats> {
  const split: Record<PaymentMethod, ChannelStats> = {
    razorpay: { revenue: 0, count: 0 },
    cash: { revenue: 0, count: 0 },
    upi: { revenue: 0, count: 0 },
    card: { revenue: 0, count: 0 },
    cod: { revenue: 0, count: 0 },
  };
  for (const sale of sales) {
    split[sale.paymentMethod].revenue += sale.total;
    split[sale.paymentMethod].count += 1;
  }
  return split;
}

/** COD vs every other (prepaid) payment method — a coarser cut of
 * paymentMethodSplit for the headline "how much of online revenue is still
 * cash-on-delivery" stat. */
export function codVsPrepaidSplit(sales: Sale[]): Record<"cod" | "prepaid", ChannelStats> {
  const split: Record<"cod" | "prepaid", ChannelStats> = {
    cod: { revenue: 0, count: 0 },
    prepaid: { revenue: 0, count: 0 },
  };
  for (const sale of sales) {
    const bucket = sale.paymentMethod === "cod" ? "cod" : "prepaid";
    split[bucket].revenue += sale.total;
    split[bucket].count += 1;
  }
  return split;
}

export interface RefundsSummary {
  count: number;
  totalAmountInr: number;
  restockedCount: number;
}

/** Sales carrying a refund record in this range — no separate query needed,
 * since refund is a field on the sale itself (see lib/server/refundSale.ts). */
export function refundsSummary(sales: Sale[]): RefundsSummary {
  const withRefund = sales.filter((s) => s.refund);
  return {
    count: withRefund.length,
    totalAmountInr: withRefund.reduce((sum, s) => sum + (s.refund?.amountInr ?? 0), 0),
    restockedCount: withRefund.filter((s) => s.refund?.restocked).length,
  };
}

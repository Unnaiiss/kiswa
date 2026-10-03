import type { Sale } from "@/lib/firestore/types";
import { itemVariantLabel, posStaffLabel } from "@/lib/admin/salesAggregation";
import { normalizeOrderStatus, ORDER_STATUS_LABELS } from "@/lib/orderFulfillment";
import { formatInr } from "@/lib/pricing";

function formatDateLabel(dayStr: string): string {
  return new Date(`${dayStr}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** The print-only target for POS Sales' "Download PDF" button — never shown
 * on screen (see app/globals.css's #pos-sales-report print rule; "hidden
 * print:block" is the same screen/print toggle packing-slip.tsx already
 * uses). Unlike every other printable document in this app (invoice,
 * receipt, packing slip, gift card — all single-page, position: absolute),
 * this one deliberately flows in normal document order so a long date range
 * can paginate across as many A4 pages as it needs. */
export function PosSalesReport({
  sales,
  fromStr,
  toStr,
  filterSummary,
}: {
  sales: Sale[];
  fromStr: string;
  toStr: string;
  /** A human-readable list of any non-default filters currently applied
   * (staff/payment method/gift-only/search), so the report is self-describing
   * about exactly what it covers without the admin screen's own UI. */
  filterSummary: string | null;
}) {
  const revenue = sales.reduce((sum, s) => sum + s.total, 0);
  const returned = sales.filter((s) => normalizeOrderStatus(s.orderStatus) === "returned");
  const returnedRevenue = returned.reduce((sum, s) => sum + s.total, 0);

  const byStaff = new Map<string, { count: number; revenue: number }>();
  for (const sale of sales) {
    const name = posStaffLabel(sale);
    const entry = byStaff.get(name) ?? { count: 0, revenue: 0 };
    entry.count += 1;
    entry.revenue += sale.total;
    byStaff.set(name, entry);
  }
  const staffRows = [...byStaff.entries()].sort((a, b) => b[1].revenue - a[1].revenue);

  return (
    <div id="pos-sales-report" className="hidden print:block">
      <div className="flex items-end justify-between border-b-2 border-black pb-3">
        <div>
          <p className="font-display text-2xl font-semibold tracking-wide">KISWA</p>
          <p className="text-sm">POS Sales Report</p>
        </div>
        <div className="text-right text-xs">
          <p className="font-medium">
            {formatDateLabel(fromStr)} – {formatDateLabel(toStr)}
          </p>
          <p>Generated {new Date().toLocaleString("en-IN")}</p>
        </div>
      </div>

      {filterSummary && (
        <p className="mt-2 text-xs italic">Filters: {filterSummary}</p>
      )}

      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded border border-black/40 p-3">
          <p className="text-[10px] uppercase tracking-wide">Revenue</p>
          <p className="mt-1 text-lg font-semibold">{formatInr(revenue)}</p>
          <p className="text-xs">{sales.length} bill{sales.length === 1 ? "" : "s"}</p>
        </div>
        <div className="rounded border border-black/40 p-3">
          <p className="text-[10px] uppercase tracking-wide">Returns</p>
          <p className="mt-1 text-lg font-semibold">{formatInr(returnedRevenue)}</p>
          <p className="text-xs">{returned.length} bill{returned.length === 1 ? "" : "s"}</p>
        </div>
        <div className="rounded border border-black/40 p-3">
          <p className="text-[10px] uppercase tracking-wide">Average Bill</p>
          <p className="mt-1 text-lg font-semibold">
            {formatInr(sales.length > 0 ? revenue / sales.length : 0)}
          </p>
        </div>
      </div>

      {staffRows.length > 0 && (
        <div className="mt-6">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide">By staff</p>
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-black/40">
                <th className="py-1.5">Staff</th>
                <th className="py-1.5 text-right">Bills</th>
                <th className="py-1.5 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {staffRows.map(([name, stats]) => (
                <tr key={name} className="border-b border-black/15">
                  <td className="py-1">{name}</td>
                  <td className="py-1 text-right">{stats.count}</td>
                  <td className="py-1 text-right font-medium">{formatInr(stats.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6">
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide">
          All bills ({sales.length})
        </p>
        <table className="w-full border-collapse text-left text-[11px]">
          <thead>
            <tr className="border-b border-black/40">
              <th className="py-1.5">Invoice</th>
              <th className="py-1.5">Date</th>
              <th className="py-1.5">Staff</th>
              <th className="py-1.5">Customer</th>
              <th className="py-1.5">Items</th>
              <th className="py-1.5 text-right">Total</th>
              <th className="py-1.5">Payment</th>
              <th className="py-1.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <tr key={sale.id} className="border-b border-black/15" style={{ breakInside: "avoid" }}>
                <td className="py-1 pr-1">{sale.invoiceNo}</td>
                <td className="py-1 pr-1">
                  {sale.createdAt.toDate().toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="py-1 pr-1">{posStaffLabel(sale)}</td>
                <td className="py-1 pr-1">{sale.customerName}</td>
                <td className="py-1 pr-1">
                  {sale.items.map((item, idx) => (
                    <span key={idx} className="block">
                      {item.productName} — {itemVariantLabel(item)} ×{item.qty}
                    </span>
                  ))}
                </td>
                <td className="py-1 pr-1 text-right font-medium">{formatInr(sale.total)}</td>
                <td className="py-1 pr-1 capitalize">{sale.paymentMethod}</td>
                <td className="py-1">{ORDER_STATUS_LABELS[normalizeOrderStatus(sale.orderStatus)]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

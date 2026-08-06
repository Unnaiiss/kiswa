"use client";

import { useMemo, useState } from "react";
import { useSalesInRange } from "@/lib/admin/useSalesInRange";
import { daysAgo, dayKey, saleHasGift } from "@/lib/admin/salesAggregation";
import { SalesTable } from "@/components/admin/sales/sales-table";
import { SaleDetail } from "@/components/admin/sales/sale-detail";
import type { OrderStatus, PaymentMethod, Sale, SaleChannel } from "@/lib/firestore/types";

const inputClass =
  "rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 outline-none focus:border-amber-400";

export default function AdminSalesPage() {
  const [fromStr, setFromStr] = useState(dayKey(daysAgo(new Date(), 29)));
  const [toStr, setToStr] = useState(dayKey(new Date()));
  const [channel, setChannel] = useState<SaleChannel | "all">("all");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "all">("all");
  const [orderStatus, setOrderStatus] = useState<OrderStatus | "all">("all");
  const [giftOnly, setGiftOnly] = useState(false);
  const [selected, setSelected] = useState<Sale | null>(null);

  const from = useMemo(() => new Date(`${fromStr}T00:00:00`), [fromStr]);
  const to = useMemo(() => new Date(`${toStr}T23:59:59.999`), [toStr]);

  const { sales, loading } = useSalesInRange(from, to);

  const filtered = useMemo(
    () =>
      sales.filter((sale) => {
        if (channel !== "all" && sale.channel !== channel) return false;
        if (paymentMethod !== "all" && sale.paymentMethod !== paymentMethod) return false;
        if (orderStatus !== "all" && sale.orderStatus !== orderStatus) return false;
        if (giftOnly && !saleHasGift(sale)) return false;
        return true;
      }),
    [sales, channel, paymentMethod, orderStatus, giftOnly],
  );

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-50">Sales</h1>
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
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="packed">Packed</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
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

      <SalesTable sales={filtered} loading={loading} onSelect={setSelected} />

      {selected && <SaleDetail sale={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

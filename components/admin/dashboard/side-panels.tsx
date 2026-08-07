"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { db } from "@/lib/firebase/client";
import { useAuthReady } from "@/lib/firebase/useAuthReady";
import { refundFlagConverter } from "@/lib/firestore/converters";
import type { RefundFlag } from "@/lib/firestore/types";
import type { TopVariantEntry } from "@/lib/admin/salesAggregation";
import type { LowStockAlert } from "@/lib/admin/useDashboardData";
import { formatInr } from "@/lib/pricing";

export function TopVariantsPanel({ items }: { items: TopVariantEntry[] }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-50">
        <TrendingUp size={16} className="text-amber-400" />
        Top 5 selling variants
        <span className="text-xs font-normal text-zinc-500">(last 30 days)</span>
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-zinc-500">No sales yet.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {items.map((item, idx) => (
            <li key={item.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 text-zinc-300">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs text-zinc-400">
                  {idx + 1}
                </span>
                {item.label}
              </span>
              <span className="shrink-0 font-semibold text-zinc-50">
                {item.qty} sold
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function LowStockPanel({ alerts }: { alerts: LowStockAlert[] }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-50">
        <AlertTriangle size={16} className="text-red-400" />
        Low-stock alerts
        {alerts.length > 0 && (
          <span className="rounded-full bg-red-400/10 px-2 py-0.5 text-xs text-red-400">
            {alerts.length}
          </span>
        )}
      </h2>
      {alerts.length === 0 ? (
        <p className="text-sm text-zinc-500">Everything is well stocked.</p>
      ) : (
        <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto">
          {alerts.map((alert) => (
            <li
              key={alert.productId}
              className="flex items-center justify-between gap-3 rounded-lg border border-red-400/20 bg-red-400/5 px-3 py-2 text-sm"
            >
              <span className="text-zinc-300">{alert.productName}</span>
              <span className="shrink-0 font-semibold text-red-400">
                {alert.amount} {alert.kind === "imported" ? "left" : "ml left"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function RefundFlagsPanel() {
  const [flags, setFlags] = useState<RefundFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const authReady = useAuthReady();

  useEffect(() => {
    if (!authReady) return;
    const q = query(
      collection(db, "refundFlags").withConverter(refundFlagConverter),
      where("status", "==", "pending"),
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setFlags(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsubscribe;
  }, [authReady]);

  if (loading || flags.length === 0) return null;

  return (
    <div className="rounded-xl border border-red-400/30 bg-red-400/5 p-5">
      <h2 className="text-sm font-semibold text-red-400">
        Refunds needed ({flags.length})
      </h2>
      <p className="mt-1 text-xs text-zinc-400">
        Payment was captured by Razorpay but the item sold out before stock
        could be reserved. Process a manual refund for each.
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {flags.map((flag) => (
          <li
            key={flag.id}
            className="rounded-lg border border-red-400/20 bg-zinc-950/40 p-3 text-sm"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-zinc-50">{flag.customerName}</span>
              <span className="text-red-300">{formatInr(flag.amountPaise / 100)}</span>
            </div>
            <p className="mt-1 text-zinc-400">{flag.customerPhone}</p>
            <p className="mt-1 text-xs text-zinc-500">
              Razorpay order {flag.razorpayOrderId} · payment {flag.razorpayPaymentId}
            </p>
            <p className="mt-1 text-xs text-zinc-500">{flag.reason}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

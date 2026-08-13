"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { DeliveryTimeline } from "@/components/account/delivery-timeline";
import type { OrderStatus } from "@/lib/firestore/types";

interface TrackResult {
  found: boolean;
  invoiceNo?: string;
  orderStatus?: OrderStatus;
  statusHistory?: { status: OrderStatus; timestamp: string }[];
  shipping?: { courierName: string | null; trackingNumber: string | null; trackingUrl: string | null } | null;
}

const inputClass =
  "w-full rounded-md border border-kiswa-border bg-kiswa-surface-2 px-4 py-2.5 text-sm text-kiswa-ink placeholder:text-kiswa-ink-muted/50 outline-none transition-colors focus:border-kiswa-gold";

export function TrackForm() {
  const [invoiceNo, setInvoiceNo] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrackResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!invoiceNo.trim() || !phone.trim()) {
      setError("Enter both your invoice number and phone number.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceNo: invoiceNo.trim(), phone: phone.trim() }),
      });
      if (res.status === 429) {
        setError("Too many attempts. Please try again in a few minutes.");
        return;
      }
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        setError("Something went wrong. Please try again.");
        return;
      }
      setResult(data);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex w-full flex-col items-center">
      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-xs tracking-wide text-kiswa-ink-muted uppercase">
            Invoice number
          </label>
          <input
            value={invoiceNo}
            onChange={(e) => setInvoiceNo(e.target.value)}
            placeholder="KSW-2026-0001"
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs tracking-wide text-kiswa-ink-muted uppercase">
            Phone number
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="10-digit mobile number"
            inputMode="numeric"
            className={inputClass}
          />
        </div>

        {error && (
          <p className="rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-kiswa-gold py-3.5 text-sm font-medium tracking-wide text-kiswa-void transition-colors hover:bg-kiswa-gold-soft disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Search size={16} />
          {submitting ? "Checking…" : "Track order"}
        </button>
      </form>

      {result && !result.found && (
        <p className="mt-6 text-center text-sm text-kiswa-ink-muted">
          We couldn&apos;t find a matching order. Double-check your invoice number and the phone
          number used to place the order.
        </p>
      )}

      {result?.found && result.orderStatus && (
        <div className="mt-8 w-full rounded-2xl border border-kiswa-border bg-kiswa-surface p-6">
          <p className="mb-1 text-xs tracking-[0.3em] text-kiswa-gold-soft uppercase">Order</p>
          <h2 className="mb-4 font-display text-2xl text-kiswa-ink">{result.invoiceNo}</h2>
          <DeliveryTimeline
            currentStatus={result.orderStatus}
            history={(result.statusHistory ?? []).map((h) => ({
              status: h.status,
              timestampMs: new Date(h.timestamp).getTime(),
            }))}
            shipping={result.shipping}
          />
        </div>
      )}
    </div>
  );
}

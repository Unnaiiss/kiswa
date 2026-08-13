"use client";

import { useEffect, useState } from "react";
import { Truck } from "lucide-react";
import { adminFetch } from "@/lib/admin/apiClient";

export function CheckoutSettingsForm({ codEnabled }: { codEnabled: boolean }) {
  const [enabled, setEnabled] = useState(codEnabled);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setEnabled(codEnabled);
  }, [codEnabled]);

  async function handleToggle(next: boolean) {
    setEnabled(next);
    setError(null);
    setSaved(false);
    setSubmitting(true);
    try {
      await adminFetch("/api/admin/site-content/checkout-settings", {
        method: "PATCH",
        body: JSON.stringify({ codEnabled: next }),
      });
      setSaved(true);
    } catch (err) {
      setEnabled(!next);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-50">
            <Truck size={18} />
            Cash on Delivery
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            When on, checkout offers &quot;Cash on Delivery&quot; alongside Razorpay — the order
            is recorded and stock deducted immediately, with payment marked pending until you
            confirm it on delivery (Sales &amp; Fulfillment &gt; the order &gt; Mark as paid).
          </p>
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            aria-label="Cash on Delivery"
            checked={enabled}
            disabled={submitting}
            onChange={(e) => handleToggle(e.target.checked)}
            className="size-4 rounded border-zinc-700 bg-zinc-900"
          />
          {enabled ? "On" : "Off"}
        </label>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {saved && !error && <p className="text-sm text-green-400">Saved.</p>}
    </div>
  );
}

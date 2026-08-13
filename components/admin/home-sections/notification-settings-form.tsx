"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { adminFetch } from "@/lib/admin/apiClient";

export function NotificationSettingsForm({
  statusChangeWhatsAppEnabled,
}: {
  statusChangeWhatsAppEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(statusChangeWhatsAppEnabled);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setEnabled(statusChangeWhatsAppEnabled);
  }, [statusChangeWhatsAppEnabled]);

  async function handleToggle(next: boolean) {
    setEnabled(next);
    setError(null);
    setSaved(false);
    setSubmitting(true);
    try {
      await adminFetch("/api/admin/site-content/notification-settings", {
        method: "PATCH",
        body: JSON.stringify({ statusChangeWhatsAppEnabled: next }),
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
            <MessageCircle size={18} />
            Order status WhatsApp notifications
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            When on, the order panel in Sales &amp; Fulfillment shows a &quot;Notify customer&quot;
            button after a status change — it opens a prewritten WhatsApp message to the
            customer&apos;s number, ready for you to review and send. Nothing is ever sent
            automatically.
          </p>
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            aria-label="Order status WhatsApp notifications"
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

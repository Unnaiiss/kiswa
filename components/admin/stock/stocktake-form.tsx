"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/admin/modal";
import { adminFetch } from "@/lib/admin/apiClient";
import type { StockRow } from "./stock-table";

const inputClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-amber-400";

interface StocktakeFormProps {
  row: StockRow;
  onClose: () => void;
  onSaved: () => void;
}

function sanitizeDecimal(value: string, wholeNumbersOnly: boolean): string {
  const cleaned = wholeNumbersOnly
    ? value.replace(/\D/g, "")
    : value.replace(/[^0-9.]/g, "");
  if (wholeNumbersOnly) return cleaned;
  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) return cleaned;
  return (
    cleaned.slice(0, firstDot + 1) +
    cleaned.slice(firstDot + 1).replace(/\./g, "")
  );
}

export function StocktakeForm({ row, onClose, onSaved }: StocktakeFormProps) {
  const isImported = row.kind === "imported";
  const unitLabel = isImported ? "unit(s)" : "ml";
  const [counted, setCounted] = useState(String(row.amount));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const countedNum = counted === "" ? null : Number(counted);
  const diff =
    countedNum === null ? 0 : Math.round((countedNum - row.amount) * 100) / 100;

  const diffLabel = useMemo(() => {
    if (countedNum === null) return null;
    if (diff === 0) return "No change — stock already matches the count.";
    return diff > 0 ? `Adjustment: +${diff} ${unitLabel}` : `Adjustment: ${diff} ${unitLabel}`;
  }, [countedNum, diff, unitLabel]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (countedNum === null || countedNum < 0 || Number.isNaN(countedNum)) {
      setError(`Enter the counted quantity in ${unitLabel} (0 or more).`);
      return;
    }
    if (isImported && !Number.isInteger(countedNum)) {
      setError("Imported products are counted in whole units.");
      return;
    }
    if (diff === 0) {
      setError("Counted quantity matches current stock — nothing to record.");
      return;
    }

    setSubmitting(true);
    try {
      await adminFetch("/api/admin/stock/adjust", {
        method: "POST",
        body: JSON.stringify({
          productId: row.productId,
          amountChange: diff,
          note: "stocktake",
        }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Set exact stock" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-sm">
          <p className="text-zinc-50">{row.productName}</p>
          <p className="mt-2 text-zinc-500">
            Current system stock:{" "}
            <span className="text-zinc-300">
              {row.amount} {unitLabel}
            </span>
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
            Counted quantity ({unitLabel})
          </label>
          <input
            value={counted}
            onChange={(e) => setCounted(sanitizeDecimal(e.target.value, isImported))}
            inputMode={isImported ? "numeric" : "decimal"}
            autoFocus
            className={inputClass}
            placeholder="e.g. 25"
          />
        </div>

        {diffLabel && (
          <p
            className={`text-sm ${diff === 0 ? "text-zinc-500" : diff > 0 ? "text-green-400" : "text-red-400"}`}
          >
            {diffLabel}
          </p>
        )}

        <p className="text-xs text-zinc-500">
          Recorded as a stock adjustment with note &ldquo;stocktake&rdquo;, so the
          movement history stays a complete audit trail.
        </p>

        {error && (
          <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <div className="mt-2 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || diff === 0}
            className="cursor-pointer rounded-lg bg-amber-400 px-5 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-300 disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save stocktake"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

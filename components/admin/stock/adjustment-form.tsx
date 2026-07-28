"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/admin/modal";
import { adminFetch } from "@/lib/admin/apiClient";
import type { Product } from "@/lib/firestore/types";

interface AdjustmentFormProps {
  products: Product[];
  onClose: () => void;
  onSaved: () => void;
}

const inputClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-amber-400";

function sanitizeDecimal(value: string): string {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) return cleaned;
  return (
    cleaned.slice(0, firstDot + 1) +
    cleaned.slice(firstDot + 1).replace(/\./g, "")
  );
}

export function AdjustmentForm({ products, onClose, onSaved }: AdjustmentFormProps) {
  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name)),
    [products],
  );
  const [productId, setProductId] = useState(sortedProducts[0]?.id ?? "");
  const product = sortedProducts.find((p) => p.id === productId);
  const [sign, setSign] = useState<1 | -1>(-1);
  const [magnitude, setMagnitude] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const magNum = Number(magnitude);
    if (!productId || !magnitude || !(magNum > 0)) {
      setError("Choose a product and a non-zero ml quantity.");
      return;
    }
    if (!note.trim()) {
      setError("A note is required for every adjustment.");
      return;
    }

    setSubmitting(true);
    try {
      await adminFetch("/api/admin/stock/adjust", {
        method: "POST",
        body: JSON.stringify({
          productId,
          mlChange: sign * magNum,
          note: note.trim(),
        }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Stock Adjustment" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
            Product
          </label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className={inputClass}
          >
            {sortedProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.oilStockMl} ml in stock
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
            Adjustment (ml)
          </label>
          <div className="flex gap-2">
            <div className="flex overflow-hidden rounded-lg border border-zinc-800">
              <button
                type="button"
                onClick={() => setSign(-1)}
                className={`px-4 py-2.5 text-sm font-semibold ${
                  sign === -1 ? "bg-red-500/20 text-red-400" : "bg-zinc-900 text-zinc-500"
                }`}
              >
                − Remove
              </button>
              <button
                type="button"
                onClick={() => setSign(1)}
                className={`px-4 py-2.5 text-sm font-semibold ${
                  sign === 1
                    ? "bg-green-500/20 text-green-400"
                    : "bg-zinc-900 text-zinc-500"
                }`}
              >
                + Add
              </button>
            </div>
            <input
              value={magnitude}
              onChange={(e) => setMagnitude(sanitizeDecimal(e.target.value))}
              inputMode="decimal"
              className={`${inputClass} flex-1`}
              placeholder="Quantity (ml)"
            />
          </div>
        </div>

        {product && magnitude && (
          <p className="text-xs text-zinc-500">
            {product.name} will go from {product.oilStockMl} ml to{" "}
            {Math.round(
              (product.oilStockMl + sign * (Number(magnitude) || 0)) * 100,
            ) / 100}{" "}
            ml.
          </p>
        )}

        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
            Note <span className="text-red-400">(required)</span>
          </label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={inputClass}
            placeholder="e.g. Damaged in storage, correcting miscount…"
          />
        </div>

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
            disabled={submitting}
            className="cursor-pointer rounded-lg bg-amber-400 px-5 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-300 disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Apply adjustment"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/admin/modal";
import { adminFetch } from "@/lib/admin/apiClient";
import { formatVariantLabel } from "@/lib/pricing";
import type { Product } from "@/lib/firestore/types";

interface StockInFormProps {
  products: Product[];
  onClose: () => void;
  onSaved: () => void;
}

const inputClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-amber-400";

export function StockInForm({ products, onClose, onSaved }: StockInFormProps) {
  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name)),
    [products],
  );
  const [productId, setProductId] = useState(sortedProducts[0]?.id ?? "");
  const product = sortedProducts.find((p) => p.id === productId);
  const [variantId, setVariantId] = useState(product?.variants[0]?.variantId ?? "");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState<"opening_stock" | "purchase" | "return">(
    "purchase",
  );
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleProductChange(id: string) {
    setProductId(id);
    const next = sortedProducts.find((p) => p.id === id);
    setVariantId(next?.variants[0]?.variantId ?? "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const qtyNum = Math.round(Number(qty));
    if (!productId || !variantId || !qtyNum || qtyNum <= 0) {
      setError("Choose a product, variant, and a positive quantity.");
      return;
    }

    setSubmitting(true);
    try {
      await adminFetch("/api/admin/stock/in", {
        method: "POST",
        body: JSON.stringify({
          productId,
          variantId,
          qty: qtyNum,
          reason,
          note: note.trim() || null,
        }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Stock In" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
            Product
          </label>
          <select
            value={productId}
            onChange={(e) => handleProductChange(e.target.value)}
            className={inputClass}
          >
            {sortedProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
            Variant
          </label>
          <select
            value={variantId}
            onChange={(e) => setVariantId(e.target.value)}
            className={inputClass}
          >
            {product?.variants.map((v) => (
              <option key={v.variantId} value={v.variantId}>
                {formatVariantLabel(v.type, v.sizeMl)} — {v.stock} in stock
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
              Quantity
            </label>
            <input
              value={qty}
              onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              className={inputClass}
              placeholder="e.g. 20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
              Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as typeof reason)}
              className={inputClass}
            >
              <option value="purchase">Purchase</option>
              <option value="opening_stock">Opening stock</option>
              <option value="return">Return</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
            Note <span className="text-zinc-600">(optional)</span>
          </label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={inputClass}
            placeholder="e.g. Invoice #482 from supplier"
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
            {submitting ? "Saving…" : "Add stock"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

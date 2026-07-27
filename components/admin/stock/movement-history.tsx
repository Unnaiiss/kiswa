"use client";

import { useMemo, useState } from "react";
import { useStockMovements } from "@/lib/admin/useStockMovements";
import { formatVariantLabel } from "@/lib/pricing";
import type { Product, StockMovementReason } from "@/lib/firestore/types";

const REASON_LABEL: Record<StockMovementReason, string> = {
  opening_stock: "Opening stock",
  purchase: "Purchase",
  online_sale: "Online sale",
  offline_sale: "POS sale",
  adjustment: "Adjustment",
  return: "Return",
};

const inputClass =
  "rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 outline-none focus:border-amber-400";

export function MovementHistory({ products }: { products: Product[] }) {
  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name)),
    [products],
  );
  const [productId, setProductId] = useState<string>("");
  const [variantId, setVariantId] = useState<string>("");

  const product = sortedProducts.find((p) => p.id === productId);

  const { movements, loading } = useStockMovements({
    productId: productId || undefined,
    variantId: variantId || undefined,
  });

  function handleProductChange(id: string) {
    setProductId(id);
    setVariantId("");
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={productId}
          onChange={(e) => handleProductChange(e.target.value)}
          className={inputClass}
        >
          <option value="">All products</option>
          {sortedProducts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={variantId}
          onChange={(e) => setVariantId(e.target.value)}
          disabled={!product}
          className={`${inputClass} disabled:opacity-40`}
        >
          <option value="">All variants</option>
          {product?.variants.map((v) => (
            <option key={v.variantId} value={v.variantId}>
              {formatVariantLabel(v.type, v.sizeMl)}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading movements…</p>
      ) : movements.length === 0 ? (
        <p className="text-sm text-zinc-500">No stock movements match.</p>
      ) : (
        <div className="max-h-[28rem] overflow-auto rounded-xl border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 border-b border-zinc-800 bg-zinc-900 text-xs tracking-wide text-zinc-500 uppercase">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Variant</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Note</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-zinc-900 last:border-none hover:bg-zinc-900/50"
                >
                  <td className="px-4 py-2.5 text-zinc-400">
                    {m.createdAt.toDate().toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-zinc-50">
                    {m.productName}
                  </td>
                  <td className="px-4 py-2.5 text-zinc-400">{m.sizeMl}ml</td>
                  <td
                    className={`px-4 py-2.5 font-semibold ${
                      m.qtyChange >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {m.qtyChange >= 0 ? `+${m.qtyChange}` : m.qtyChange}
                  </td>
                  <td className="px-4 py-2.5 text-zinc-400">
                    {REASON_LABEL[m.reason]}
                  </td>
                  <td className="px-4 py-2.5 text-zinc-500">{m.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { Product } from "@/lib/firestore/types";

export interface StockRow {
  productId: string;
  productName: string;
  kind: "attar" | "imported";
  /** oilStockMl (attar) or unitStock (imported). */
  amount: number;
  /** lowStockThresholdMl (attar) or lowStockThresholdUnits (imported). */
  threshold: number;
  isActive: boolean;
}

function buildRows(products: Product[]): StockRow[] {
  return products.map((product) =>
    product.productType === "imported"
      ? {
          productId: product.id,
          productName: product.name,
          kind: "imported",
          amount: product.unitStock,
          threshold: product.lowStockThresholdUnits,
          isActive: product.isActive,
        }
      : {
          productId: product.id,
          productName: product.name,
          kind: "attar",
          amount: product.oilStockMl,
          threshold: product.lowStockThresholdMl,
          isActive: product.isActive,
        },
  );
}

function formatAmount(row: Pick<StockRow, "kind" | "amount">): string {
  if (row.kind === "imported") {
    return `${row.amount} unit${row.amount === 1 ? "" : "s"}`;
  }
  return `${Number(row.amount.toFixed(1))} ml`;
}

interface StockTableProps {
  products: Product[];
  loading: boolean;
  onStocktake: (row: StockRow) => void;
}

export function StockTable({ products, loading, onStocktake }: StockTableProps) {
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const rows = useMemo(() => buildRows(products), [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (q && !row.productName.toLowerCase().includes(q)) return false;
      if (lowStockOnly && row.amount > row.threshold) return false;
      return true;
    });
  }, [rows, search, lowStockOnly]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-500"
            size={16}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-2.5 pr-3 pl-9 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-amber-400"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-400">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
            className="size-4 rounded border-zinc-700 bg-zinc-900"
          />
          Low stock only
        </label>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading stock…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-zinc-500">No products match.</p>
      ) : (
        <div className="max-h-[32rem] overflow-auto rounded-xl border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 border-b border-zinc-800 bg-zinc-900 text-xs tracking-wide text-zinc-500 uppercase">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Threshold</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const low = row.amount <= row.threshold;
                return (
                  <tr
                    key={row.productId}
                    className="border-b border-zinc-900 last:border-none hover:bg-zinc-900/50"
                  >
                    <td className="px-4 py-2.5 font-medium text-zinc-50">
                      {row.productName}
                    </td>
                    <td
                      className={`px-4 py-2.5 font-semibold ${low ? "text-red-400" : "text-zinc-300"}`}
                    >
                      {formatAmount(row)}
                    </td>
                    <td className="px-4 py-2.5 text-zinc-500">
                      {formatAmount({ kind: row.kind, amount: row.threshold })}
                    </td>
                    <td className="px-4 py-2.5">
                      {!row.isActive ? (
                        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
                          Inactive
                        </span>
                      ) : low ? (
                        <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-400">
                          Low stock
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-400">
                          OK
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => onStocktake(row)}
                        className="cursor-pointer rounded-lg border border-zinc-700 px-2.5 py-1 text-xs font-medium text-zinc-300 hover:border-amber-400 hover:text-amber-400"
                      >
                        Set stock
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { ArrowDownUp, PackagePlus } from "lucide-react";
import { useAllProducts } from "@/lib/admin/useAllProducts";
import { StockTable, type StockRow } from "@/components/admin/stock/stock-table";
import { StockInForm } from "@/components/admin/stock/stock-in-form";
import { AdjustmentForm } from "@/components/admin/stock/adjustment-form";
import { StocktakeForm } from "@/components/admin/stock/stocktake-form";
import { MovementHistory } from "@/components/admin/stock/movement-history";

export default function AdminStockPage() {
  const { products, loading } = useAllProducts();
  const [dialog, setDialog] = useState<"in" | "adjust" | null>(null);
  const [stocktakeRow, setStocktakeRow] = useState<StockRow | null>(null);

  return (
    <div className="flex flex-col gap-8 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-50">Stock</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Current stock per variant, with a full audit trail.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setDialog("in")}
            className="flex cursor-pointer items-center gap-2 rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-300"
          >
            <PackagePlus size={16} />
            Stock In
          </button>
          <button
            type="button"
            onClick={() => setDialog("adjust")}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:border-zinc-600"
          >
            <ArrowDownUp size={16} />
            Adjustment
          </button>
        </div>
      </div>

      <section>
        <StockTable
          products={products}
          loading={loading}
          onStocktake={(row) => setStocktakeRow(row)}
        />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-zinc-50">Movement history</h2>
        <MovementHistory products={products} />
      </section>

      {dialog === "in" && (
        <StockInForm
          products={products}
          onClose={() => setDialog(null)}
          onSaved={() => setDialog(null)}
        />
      )}
      {dialog === "adjust" && (
        <AdjustmentForm
          products={products}
          onClose={() => setDialog(null)}
          onSaved={() => setDialog(null)}
        />
      )}
      {stocktakeRow && (
        <StocktakeForm
          row={stocktakeRow}
          onClose={() => setStocktakeRow(null)}
          onSaved={() => setStocktakeRow(null)}
        />
      )}
    </div>
  );
}

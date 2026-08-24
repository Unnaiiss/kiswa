"use client";

import { useState } from "react";
import { Download, Plus } from "lucide-react";
import { useAllProducts } from "@/lib/admin/useAllProducts";
import { ProductTable } from "@/components/admin/products/product-table";
import { ProductForm } from "@/components/admin/products/product-form";
import { QueryErrorBanner } from "@/components/admin/query-error-banner";
import { adminFetch } from "@/lib/admin/apiClient";
import { downloadCsv } from "@/lib/admin/csv";
import type { Product } from "@/lib/firestore/types";

interface MetaCatalogExportResult {
  csv: string;
  count: number;
  skipped: { productId: string; productName: string; variantId?: string; reason: string }[];
  imageWarnings: { productId: string; productName: string; url: string; reason: string }[];
}

export default function AdminProductsPage() {
  const { products, loading, error } = useAllProducts();
  const [dialog, setDialog] = useState<
    { mode: "create" } | { mode: "edit"; product: Product } | null
  >(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportResult, setExportResult] = useState<Omit<MetaCatalogExportResult, "csv"> | null>(
    null,
  );

  async function handleExportMetaCatalog() {
    setExporting(true);
    setExportError(null);
    try {
      const data = await adminFetch<MetaCatalogExportResult>(
        "/api/admin/products/export-meta-catalog",
      );
      downloadCsv(data.csv, "kiswa-meta-catalog.csv");
      setExportResult({ count: data.count, skipped: data.skipped, imageWarnings: data.imageWarnings });
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-50">Products</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Manage the catalog, pricing, and variant availability.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleExportMetaCatalog}
            disabled={exporting}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:border-amber-400 hover:text-amber-400 disabled:opacity-40"
          >
            <Download size={16} />
            {exporting ? "Exporting…" : "Export Meta Catalog (CSV)"}
          </button>
          <button
            type="button"
            onClick={() => setDialog({ mode: "create" })}
            className="flex cursor-pointer items-center gap-2 rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-300"
          >
            <Plus size={16} />
            Add Product
          </button>
        </div>
      </div>

      {error && <QueryErrorBanner error={error} />}

      {exportError && <QueryErrorBanner error={exportError} />}

      {exportResult && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm">
          <div className="flex items-center justify-between">
            <p className="text-zinc-50">
              Exported <span className="font-semibold">{exportResult.count}</span> row(s) to{" "}
              <span className="font-mono text-xs">kiswa-meta-catalog.csv</span>.
            </p>
            <button
              type="button"
              onClick={() => setExportResult(null)}
              className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-300"
            >
              Dismiss
            </button>
          </div>
          {exportResult.skipped.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                Skipped ({exportResult.skipped.length})
              </p>
              <ul className="mt-1 max-h-40 overflow-y-auto text-xs text-zinc-400">
                {exportResult.skipped.map((s, i) => (
                  <li key={i}>
                    {s.productName}
                    {s.variantId ? ` (${s.variantId})` : ""} — {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {exportResult.imageWarnings.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium tracking-wide text-amber-400 uppercase">
                Image warnings ({exportResult.imageWarnings.length})
              </p>
              <ul className="mt-1 max-h-40 overflow-y-auto text-xs text-zinc-400">
                {exportResult.imageWarnings.map((w, i) => (
                  <li key={i}>
                    {w.productName} — {w.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <ProductTable
        products={products}
        loading={loading}
        onEdit={(product) => setDialog({ mode: "edit", product })}
      />

      {dialog?.mode === "create" && (
        <ProductForm
          mode="create"
          onClose={() => setDialog(null)}
          onSaved={() => setDialog(null)}
        />
      )}
      {dialog?.mode === "edit" && (
        <ProductForm
          mode="edit"
          product={dialog.product}
          onClose={() => setDialog(null)}
          onSaved={() => setDialog(null)}
        />
      )}
    </div>
  );
}

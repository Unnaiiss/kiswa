"use client";

import { useMemo, useState } from "react";
import { Pencil, Search } from "lucide-react";
import { ProductImage } from "@/components/store/product-image";
import type { Product, ProductType } from "@/lib/firestore/types";
import { formatInr, getStartingPrice } from "@/lib/pricing";

interface ProductTableProps {
  products: Product[];
  loading: boolean;
  onEdit: (product: Product) => void;
}

const TYPE_FILTERS: { value: ProductType | "all"; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "attar", label: "Attar" },
  { value: "imported", label: "Imported" },
];

export function ProductTable({ products, loading, onEdit }: ProductTableProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ProductType | "all">("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (typeFilter !== "all" && p.productType !== typeFilter) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.category.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [products, search, typeFilter]);

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
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as ProductType | "all")}
          className="cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-50 outline-none focus:border-amber-400"
        >
          {TYPE_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading products…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-zinc-500">No products match &ldquo;{search}&rdquo;.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900 text-xs tracking-wide text-zinc-500 uppercase">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => {
                const isImported = product.productType === "imported";
                return (
                  <tr
                    key={product.id}
                    className="border-b border-zinc-900 last:border-none hover:bg-zinc-900/50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative size-10 shrink-0 overflow-hidden rounded-lg border border-zinc-800">
                          <ProductImage
                            name={product.name}
                            imageUrls={product.imageUrls}
                            className="h-full w-full"
                            sizes="40px"
                          />
                        </div>
                        <span className="font-medium text-zinc-50">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          isImported
                            ? "bg-sky-500/10 text-sky-400"
                            : "bg-purple-500/10 text-purple-400"
                        }`}
                      >
                        {isImported ? "Imported" : "Attar"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{product.category}</td>
                    <td className="px-4 py-3 text-zinc-300">
                      {isImported
                        ? formatInr(product.priceInr)
                        : formatInr(getStartingPrice(product.variants))}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      {isImported
                        ? `${product.unitStock} unit${product.unitStock === 1 ? "" : "s"}`
                        : `${Number(product.oilStockMl.toFixed(1))} ml`}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          product.isActive
                            ? "bg-green-500/10 text-green-400"
                            : "bg-zinc-800 text-zinc-500"
                        }`}
                      >
                        {product.isActive ? "Active" : "Pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onEdit(product)}
                        aria-label={`Edit ${product.name}`}
                        className="cursor-pointer rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-amber-400"
                      >
                        <Pencil size={16} />
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

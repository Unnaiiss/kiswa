"use client";

import { useMemo, useState } from "react";
import { Pencil, Search } from "lucide-react";
import { ProductImage } from "@/components/store/product-image";
import type { Product } from "@/lib/firestore/types";
import { formatInr, getStartingPrice } from "@/lib/pricing";

interface ProductTableProps {
  products: Product[];
  loading: boolean;
  onEdit: (product: Product) => void;
}

export function ProductTable({ products, loading, onEdit }: ProductTableProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q),
    );
  }, [products, search]);

  return (
    <div>
      <div className="relative mb-4 max-w-sm">
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
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">From</th>
                <th className="px-4 py-3">Total stock</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => {
                const totalStock = product.variants.reduce((n, v) => n + v.stock, 0);
                return (
                  <tr
                    key={product.id}
                    className="border-b border-zinc-900 last:border-none hover:bg-zinc-900/50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="size-10 shrink-0 overflow-hidden rounded-lg border border-zinc-800">
                          <ProductImage
                            name={product.name}
                            imageUrls={product.imageUrls}
                            className="h-full w-full"
                          />
                        </div>
                        <span className="font-medium text-zinc-50">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{product.category}</td>
                    <td className="px-4 py-3 text-zinc-300">
                      {formatInr(getStartingPrice(product.variants))}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">{totalStock}</td>
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

"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { Product } from "@/lib/firestore/types";
import { ProductTile } from "./product-tile";

interface ProductGridProps {
  products: Product[];
  loading: boolean;
  onSelect: (product: Product) => void;
  bottomPadding?: boolean;
}

export function ProductGrid({
  products,
  loading,
  onSelect,
  bottomPadding,
}: ProductGridProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, search]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/95 p-4 backdrop-blur">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-zinc-500"
            size={20}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search fragrances…"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-4 pr-4 pl-12 text-lg text-zinc-50 placeholder:text-zinc-500 outline-none focus:border-amber-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <p className="p-6 text-center text-zinc-500">Loading products…</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-center text-zinc-500">
            No fragrances match &ldquo;{search}&rdquo;.
          </p>
        ) : (
          <div
            className={`grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 ${bottomPadding ? "pb-28 lg:pb-4" : ""}`}
          >
            {filtered.map((product) => (
              <ProductTile
                key={product.id}
                product={product}
                onTap={() => onSelect(product)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

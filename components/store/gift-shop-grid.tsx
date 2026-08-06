"use client";

import { useMemo, useState } from "react";
import type { StoreProduct } from "@/lib/store/queries";
import type { VariantType } from "@/lib/firestore/types";
import { getStartingPrice } from "@/lib/pricing";
import { ProductCard } from "./product-card";
import { StaggerGrid, StaggerItem } from "./reveal";

type TypeFilter = "all" | VariantType;
type SortOption = "featured" | "price-asc" | "price-desc";

const TYPE_TABS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "oil", label: "Perfume Oils" },
  { value: "spray", label: "Perfume Sprays" },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
];

export function GiftShopGrid({ products }: { products: StoreProduct[] }) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sort, setSort] = useState<SortOption>("featured");

  const filtered = useMemo(() => {
    const byType =
      typeFilter === "all"
        ? products
        : products.filter((p) =>
            p.variants.some((v) => v.isActive && v.type === typeFilter),
          );

    if (sort === "featured") return byType;
    const withPrice = byType.map((p) => ({
      product: p,
      price: getStartingPrice(p.variants),
    }));
    withPrice.sort((a, b) =>
      sort === "price-asc" ? a.price - b.price : b.price - a.price,
    );
    return withPrice.map((entry) => entry.product);
  }, [products, typeFilter, sort]);

  return (
    <div>
      <div className="mb-12 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-3">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setTypeFilter(tab.value)}
              className={`cursor-pointer rounded-full border px-5 py-2 text-sm tracking-wide transition-colors ${
                typeFilter === tab.value
                  ? "border-kiswa-gold bg-kiswa-gold text-kiswa-void"
                  : "border-kiswa-border text-kiswa-ink-muted hover:border-kiswa-gold/50 hover:text-kiswa-gold"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="cursor-pointer rounded-full border border-kiswa-border bg-kiswa-surface px-4 py-2 text-sm text-kiswa-ink-muted outline-none transition-colors focus:border-kiswa-gold"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="py-20 text-center text-kiswa-ink-muted">
          No fragrances match these filters yet.
        </p>
      ) : (
        <StaggerGrid className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((product) => (
            <StaggerItem key={product.id}>
              <ProductCard product={product} giftMode />
            </StaggerItem>
          ))}
        </StaggerGrid>
      )}
    </div>
  );
}

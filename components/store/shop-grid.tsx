"use client";

import { useMemo, useState } from "react";
import type { StoreProduct } from "@/lib/store/queries";
import { ProductCard } from "./product-card";
import { StaggerGrid, StaggerItem } from "./reveal";

export function ShopGrid({
  products,
  categories,
}: {
  products: StoreProduct[];
  categories: string[];
}) {
  const [active, setActive] = useState<string>("All");

  const filtered = useMemo(
    () =>
      active === "All"
        ? products
        : products.filter((p) => p.category === active),
    [products, active],
  );

  const tabs = ["All", ...categories];

  return (
    <div>
      <div className="mb-12 flex flex-wrap justify-center gap-3">
        {tabs.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActive(cat)}
            className={`cursor-pointer rounded-full border px-5 py-2 text-sm tracking-wide transition-colors ${
              active === cat
                ? "border-kiswa-gold bg-kiswa-gold text-kiswa-void"
                : "border-kiswa-border text-kiswa-ink-muted hover:border-kiswa-gold/50 hover:text-kiswa-gold"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-20 text-center text-kiswa-ink-muted">
          No fragrances in this category yet.
        </p>
      ) : (
        <StaggerGrid className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((product) => (
            <StaggerItem key={product.id}>
              <ProductCard product={product} />
            </StaggerItem>
          ))}
        </StaggerGrid>
      )}
    </div>
  );
}

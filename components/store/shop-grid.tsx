"use client";

import { useEffect, useMemo, useState } from "react";
import type { StoreProduct } from "@/lib/store/queries";
import type { VariantType } from "@/lib/firestore/types";
import { ProductCard } from "./product-card";
import { StaggerGrid, StaggerItem } from "./reveal";

/** "imported" is a pseudo-type filter alongside the real oil/spray variant
 * types — selects products whose productType is "imported" rather than
 * filtering by variant. */
export type ShopTypeFilter = VariantType | "imported";

export function ShopGrid({
  products,
  categories,
}: {
  products: StoreProduct[];
  categories: string[];
}) {
  const [active, setActive] = useState<string>("All");
  const [type, setType] = useState<ShopTypeFilter | undefined>(undefined);

  // Reads ?category=/?type= itself, straight off window.location — NOT via
  // next/navigation's useSearchParams(), which would force this component
  // behind a <Suspense> boundary at the page level. That Suspense boundary
  // was tried first (see git history) and caused a worse bug than the one it
  // fixed: React always fully unmounts a Suspense fallback and mounts its
  // resolved children fresh rather than reconciling between them, so right
  // after hydration the ENTIRE grid (every product card's <a>) got torn down
  // and rebuilt — if a visitor's tap landed in that window, the tap was lost
  // entirely, requiring a second tap on the now-settled new DOM. Reading the
  // URL via a plain effect instead means ShopGrid mounts exactly once and
  // never gets torn down; applying the filter after mount is just a normal
  // re-render (React keeps each still-matching card's existing DOM node).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const category = params.get("category");
    if (category && categories.includes(category)) setActive(category);
    const urlType = params.get("type");
    if (urlType === "oil" || urlType === "spray" || urlType === "imported") {
      setType(urlType);
    }
    // Only ever meant to seed state from the URL once, right after mount —
    // categories is static for the lifetime of this component anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const byCategory =
      active === "All" ? products : products.filter((p) => p.category === active);
    if (!type) return byCategory;
    if (type === "imported") {
      return byCategory.filter((p) => p.productType === "imported");
    }
    return byCategory.filter(
      (p) =>
        p.productType === "attar" &&
        p.variants.some((v) => v.isActive && v.type === type),
    );
  }, [products, active, type]);

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

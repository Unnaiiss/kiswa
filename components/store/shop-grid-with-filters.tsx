"use client";

import { useSearchParams } from "next/navigation";
import type { StoreProduct } from "@/lib/store/queries";
import { ShopGrid, type ShopTypeFilter } from "./shop-grid";

/** Reads ?category=/?type= itself instead of /shop's page taking
 * `searchParams` as a prop — see product-buy-box.tsx's own comment for why
 * (a Server Component reading searchParams can't be ISR-cached at all). */
export function ShopGridWithFilters({
  products,
  categories,
}: {
  products: StoreProduct[];
  categories: string[];
}) {
  const searchParams = useSearchParams();
  const category = searchParams.get("category") ?? undefined;
  const type = searchParams.get("type");
  const initialType: ShopTypeFilter | undefined =
    type === "oil" || type === "spray" || type === "imported" ? type : undefined;

  return (
    <ShopGrid
      products={products}
      categories={categories}
      initialCategory={category}
      initialType={initialType}
    />
  );
}

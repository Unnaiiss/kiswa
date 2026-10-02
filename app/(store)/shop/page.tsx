import { Suspense } from "react";
import type { Metadata } from "next";
import { getActiveProducts } from "@/lib/store/queries";
import { getCategories } from "@/lib/store/categories";
import { ShopGrid } from "@/components/store/shop-grid";
import { ShopGridWithFilters } from "@/components/store/shop-grid-with-filters";
import { Reveal } from "@/components/store/reveal";

// This page previously took `searchParams` directly, which forces fully
// dynamic, uncached rendering on every request (same issue fixed on
// product/[slug] and offers/[slug] — see their own comments) — the
// category/type filter read moved into ShopGridWithFilters instead so this
// page itself can stay ISR-cacheable.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Browse the full KISWA collection of attar oils and perfume sprays.",
};

export default async function ShopPage() {
  const products = await getActiveProducts();
  const categories = getCategories(products);

  return (
    <main className="flex-1 px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mb-14 flex flex-col items-center gap-3 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-kiswa-gold-soft">
            Shop
          </p>
          <h1 className="font-display text-4xl text-kiswa-ink sm:text-5xl">
            The Full Collection
          </h1>
          <p className="max-w-md text-kiswa-ink-muted">
            {products.length} fragrances, each available as a pure attar oil
            or a fine perfume spray.
          </p>
        </Reveal>

        <Suspense fallback={<ShopGrid products={products} categories={categories} />}>
          <ShopGridWithFilters products={products} categories={categories} />
        </Suspense>
      </div>
    </main>
  );
}

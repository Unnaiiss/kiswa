import Link from "next/link";
import type { StoreProduct } from "@/lib/store/queries";
import { Reveal, StaggerGrid, StaggerItem } from "./reveal";
import { ProductCard } from "./product-card";

export function FeaturedProducts({ products }: { products: StoreProduct[] }) {
  return (
    <section className="bg-kiswa-void px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mb-12 flex flex-col items-center gap-3 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-kiswa-gold-soft">
            The Collection
          </p>
          <h2 className="font-display text-4xl text-kiswa-ink sm:text-5xl">
            Featured Fragrances
          </h2>
        </Reveal>

        <StaggerGrid className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <StaggerItem key={product.id}>
              <ProductCard product={product} />
            </StaggerItem>
          ))}
        </StaggerGrid>

        <div className="mt-16 flex justify-center">
          <Link
            href="/shop"
            className="cursor-pointer rounded-full border border-kiswa-gold/50 px-8 py-3 text-sm tracking-wide text-kiswa-gold transition-colors hover:bg-kiswa-gold hover:text-kiswa-void"
          >
            View Full Collection
          </Link>
        </div>
      </div>
    </section>
  );
}

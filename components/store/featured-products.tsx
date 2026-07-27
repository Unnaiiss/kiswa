import type { StoreProduct } from "@/lib/store/queries";
import { Reveal } from "./reveal";
import { FocusRail } from "./focus-rail";
import { FlowButton } from "@/components/ui/flow-button";

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

        <FocusRail products={products} />

        <div className="mt-4 flex justify-center">
          <FlowButton href="/shop">View Full Collection</FlowButton>
        </div>
      </div>
    </section>
  );
}

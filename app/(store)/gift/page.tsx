import type { Metadata } from "next";
import { getActiveProducts } from "@/lib/store/queries";
import { GiftShopGrid } from "@/components/store/gift-shop-grid";
import { Reveal } from "@/components/store/reveal";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Gift a Perfume",
  description:
    "Choose a KISWA attar oil or perfume spray to gift, add a personal message, and we'll wrap it beautifully.",
};

export default async function GiftPage() {
  const products = await getActiveProducts();

  return (
    <main className="flex-1 px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mb-14 flex flex-col items-center gap-3 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-kiswa-gold-soft">
            Gifting
          </p>
          <h1 className="font-display text-4xl text-kiswa-ink sm:text-5xl">
            Choose a Gift
          </h1>
          <p className="max-w-md text-kiswa-ink-muted">
            Every fragrance here can be gift-wrapped with a personal note —
            pick a favorite and we&apos;ll handle the rest.
          </p>
        </Reveal>

        <GiftShopGrid products={products} />
      </div>
    </main>
  );
}

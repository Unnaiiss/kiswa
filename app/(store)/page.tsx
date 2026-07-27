import type { Metadata } from "next";
import { getFeaturedProducts } from "@/lib/store/queries";
import { Hero } from "@/components/store/hero";
import { FeaturedProducts } from "@/components/store/featured-products";
import { OurStory } from "@/components/store/our-story";

// Revalidate periodically instead of serving a build-time snapshot forever —
// stock and pricing change with every sale.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "KISWA — Pure Attar Oils & Perfume Sprays",
  description:
    "KISWA crafts concentrated attar oils and the fine perfume sprays distilled from them. Explore the collection.",
};

export default async function HomePage() {
  const products = await getFeaturedProducts(8);

  return (
    <main className="flex flex-1 flex-col">
      <Hero />
      <FeaturedProducts products={products} />
      <OurStory />
    </main>
  );
}

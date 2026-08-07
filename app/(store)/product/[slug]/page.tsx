import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/store/queries";
import { ProductGallery } from "@/components/store/product-gallery";
import { VariantSelector } from "@/components/store/variant-selector";
import { ImportedBuyBox } from "@/components/store/imported-buy-box";
import { FragranceNotes } from "@/components/store/fragrance-notes";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ gift?: string }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};

  return {
    title: `${product.name} — KISWA`,
    description: product.description,
  };
}

export default async function ProductPage({
  params,
  searchParams,
}: ProductPageProps) {
  const [{ slug }, { gift }] = await Promise.all([params, searchParams]);
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  return (
    <main className="flex-1 px-6 py-16 sm:py-20">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:gap-20">
        <ProductGallery name={product.name} imageUrls={product.imageUrls} />

        <div className="flex flex-col gap-8">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-kiswa-gold-soft">
              {product.category}
            </p>
            <h1 className="mt-3 font-display text-4xl text-kiswa-ink sm:text-5xl">
              {product.name}
            </h1>
            <p className="mt-4 max-w-md text-kiswa-ink-muted">
              {product.description}
            </p>
          </div>

          <FragranceNotes notes={product.notes} />

          <div className="h-px w-full bg-kiswa-border" />

          {product.productType === "imported" ? (
            <ImportedBuyBox product={product} giftMode={gift === "1"} />
          ) : (
            <VariantSelector product={product} giftMode={gift === "1"} />
          )}
        </div>
      </div>
    </main>
  );
}

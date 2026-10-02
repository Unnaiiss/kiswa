import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/store/queries";
import { ProductGallery } from "@/components/store/product-gallery";
import { ProductBuyBox, ProductBuyBoxFallback } from "@/components/store/product-buy-box";
import { FragranceNotes } from "@/components/store/fragrance-notes";

// Was missing from this page while every other storefront listing/detail
// page already had it — meant every single tap on a product card did a full,
// uncached Firestore round-trip before the page could render (and blocked
// next/link's prefetch from ever having anything cached to prefetch), which
// is what made opening a product feel slow/unresponsive rather than instant.
// Stock/pricing accuracy isn't weakened by this: checkout/recordSale always
// re-derive both live and authoritatively regardless of what this page shows.
export const revalidate = 60;

// Required (even as an empty list) for a dynamic `[slug]` route to actually
// get on-demand ISR caching at all — without it, Next.js renders every
// request from scratch regardless of `revalidate` above. dynamicParams stays
// at its default (true), so any slug not in this list is still generated on
// first visit and then cached for `revalidate` seconds, same as the ones
// that would've been listed here.
export async function generateStaticParams() {
  return [];
}

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};

  const image = product.imageUrls[0];

  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      type: "website",
      ...(image && { images: [{ url: image }] }),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: product.name,
      description: product.description,
      ...(image && { images: [image] }),
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
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

          <Suspense fallback={<ProductBuyBoxFallback product={product} />}>
            <ProductBuyBox product={product} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

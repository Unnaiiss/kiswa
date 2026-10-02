"use client";

import { useSearchParams } from "next/navigation";
import type { StoreProduct } from "@/lib/store/queries";
import { VariantSelector } from "./variant-selector";
import { ImportedBuyBox } from "./imported-buy-box";

/** Reads ?gift=/?variant= itself (client-side) instead of the product page
 * taking `searchParams` as a prop — a Server Component that reads
 * searchParams is forced into fully dynamic, uncached rendering on every
 * request, which is what made tapping into a product page feel slow instead
 * of instant (see app/(store)/product/[slug]/page.tsx's own comment). Moving
 * that read down into this small client island, wrapped in Suspense, lets
 * the page itself stay a cacheable/prefetchable ISR page while still
 * supporting the ?gift=1 and ?variant=<id> deep links — the trade-off is
 * that those two links render the default (non-gift, first-variant) state
 * for one tick before this component mounts and corrects it, rather than
 * having it baked into the very first byte of HTML. */
export function ProductBuyBox({ product }: { product: StoreProduct }) {
  const searchParams = useSearchParams();
  const giftMode = searchParams.get("gift") === "1";
  const variant = searchParams.get("variant") ?? undefined;

  if (product.productType === "imported") {
    return <ImportedBuyBox product={product} giftMode={giftMode} />;
  }
  return <VariantSelector product={product} giftMode={giftMode} initialVariantId={variant} />;
}

/** The Suspense fallback for ProductBuyBox above — identical to how it
 * renders with no query params at all (the overwhelming majority of visits),
 * so there's no visible flash for a plain tap into a product; only a
 * ?gift=1/?variant= deep link briefly shows this default state before
 * ProductBuyBox mounts and corrects it. */
export function ProductBuyBoxFallback({ product }: { product: StoreProduct }) {
  if (product.productType === "imported") {
    return <ImportedBuyBox product={product} />;
  }
  return <VariantSelector product={product} />;
}

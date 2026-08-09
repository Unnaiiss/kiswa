"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { StoreProduct } from "@/lib/store/queries";
import { formatInr } from "@/lib/pricing";
import { productDisplayPrice } from "@/lib/products";
import { ProductImage } from "./product-image";
import { TiltCard } from "@/components/ui/tilt-card";

export function ProductCard({
  product,
  giftMode = false,
}: {
  product: StoreProduct;
  /** Links to the product page pre-flagged for the gift flow (see /gift). */
  giftMode?: boolean;
}) {
  const isImported = product.productType === "imported";
  const price = productDisplayPrice(product);
  const href = giftMode
    ? `/product/${product.slug}?gift=1`
    : `/product/${product.slug}`;

  return (
    <TiltCard>
      <motion.div
        whileHover={{ y: -6 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <Link href={href} className="group block">
          <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-kiswa-border bg-kiswa-surface">
            <motion.div
              className="h-full w-full"
              whileHover={{ scale: 1.06 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <ProductImage
                name={product.name}
                imageUrls={product.imageUrls}
                className="h-full w-full"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              />
            </motion.div>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-kiswa-void/70 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <span className="absolute left-3 top-3 rounded-full bg-kiswa-void/70 px-2.5 py-1 text-[10px] uppercase tracking-wide text-kiswa-gold-soft backdrop-blur-sm">
              {product.category}
            </span>
          </div>
          <div className="mt-4 space-y-1">
            {product.productType === "imported" && product.brand && (
              <p className="truncate text-xs uppercase tracking-[0.2em] text-kiswa-gold-soft">
                {product.brand}
              </p>
            )}
            <h3 className="font-display text-lg text-kiswa-ink transition-colors group-hover:text-kiswa-gold">
              {product.name}
            </h3>
            {product.productType === "imported" ? (
              <p className="truncate text-xs uppercase tracking-wide text-kiswa-ink-muted">
                {product.sizeLabel}
              </p>
            ) : (
              product.notes.length > 0 && (
                <p className="truncate text-xs uppercase tracking-wide text-kiswa-ink-muted">
                  {product.notes.slice(0, 3).join(" · ")}
                </p>
              )
            )}
            <p className="text-sm text-kiswa-gold">
              {isImported ? formatInr(price) : `From ${formatInr(price)}`}
            </p>
          </div>
        </Link>
      </motion.div>
    </TiltCard>
  );
}

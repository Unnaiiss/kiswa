"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { StoreProduct } from "@/lib/store/queries";
import { formatInr, getStartingPrice } from "@/lib/pricing";
import { ProductImage } from "./product-image";

export function ProductCard({ product }: { product: StoreProduct }) {
  const startingPrice = getStartingPrice(product.variants);

  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link href={`/product/${product.slug}`} className="group block">
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
            />
          </motion.div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-kiswa-void/70 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </div>
        <div className="mt-4 space-y-1">
          <h3 className="font-display text-lg text-kiswa-ink transition-colors group-hover:text-kiswa-gold">
            {product.name}
          </h3>
          {product.notes.length > 0 && (
            <p className="truncate text-xs uppercase tracking-wide text-kiswa-ink-muted">
              {product.notes.slice(0, 3).join(" · ")}
            </p>
          )}
          <p className="text-sm text-kiswa-gold">
            From {formatInr(startingPrice)}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}

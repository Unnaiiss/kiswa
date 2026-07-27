"use client";

import { ProductImage } from "@/components/store/product-image";
import type { Product } from "@/lib/firestore/types";
import { formatInr, getStartingPrice } from "@/lib/pricing";

interface ProductTileProps {
  product: Product;
  onTap: () => void;
}

export function ProductTile({ product, onTap }: ProductTileProps) {
  const sellable = product.variants.some((v) => v.isActive && v.stock > 0);
  const startingPrice = getStartingPrice(product.variants);

  return (
    <button
      type="button"
      onClick={onTap}
      disabled={!sellable}
      className={`flex flex-col overflow-hidden rounded-xl border text-left transition-colors ${
        sellable
          ? "cursor-pointer border-zinc-800 bg-zinc-900 active:border-amber-400"
          : "cursor-not-allowed border-zinc-900 bg-zinc-950 opacity-50"
      }`}
    >
      <div className="relative aspect-square">
        <ProductImage
          name={product.name}
          imageUrls={product.imageUrls}
          className="h-full w-full"
        />
        {!sellable && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/70">
            <span className="text-xs font-semibold uppercase tracking-wide text-red-400">
              Sold out
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-3">
        <p className="line-clamp-2 text-sm leading-tight font-medium text-zinc-50">
          {product.name}
        </p>
        <p className="text-sm font-semibold text-amber-400">
          From {formatInr(startingPrice)}
        </p>
      </div>
    </button>
  );
}

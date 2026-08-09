"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ProductImage } from "./product-image";

export function ProductGallery({
  name,
  imageUrls,
}: {
  name: string;
  imageUrls: string[];
}) {
  const [active, setActive] = useState(0);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-square overflow-hidden rounded-lg border border-kiswa-border bg-kiswa-surface">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full w-full"
          >
            <ProductImage
              name={name}
              imageUrls={imageUrls}
              index={active}
              className="h-full w-full"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {imageUrls.length > 1 && (
        <div className="flex gap-3">
          {imageUrls.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show image ${i + 1}`}
              className={`relative h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-md border transition-colors ${
                active === i ? "border-kiswa-gold" : "border-kiswa-border"
              }`}
            >
              <ProductImage
                name={name}
                imageUrls={imageUrls}
                index={i}
                className="h-full w-full"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

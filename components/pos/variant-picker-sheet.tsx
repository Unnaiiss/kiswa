"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { Product, ProductVariant } from "@/lib/firestore/types";
import { formatInr, formatVariantLabel } from "@/lib/pricing";

interface VariantPickerSheetProps {
  product: Product | null;
  onSelect: (product: Product, variant: ProductVariant) => void;
  onClose: () => void;
}

const TYPE_LABEL: Record<string, string> = {
  oil: "Perfume Oil",
  spray: "Perfume Spray",
};

export function VariantPickerSheet({
  product,
  onSelect,
  onClose,
}: VariantPickerSheetProps) {
  return (
    <AnimatePresence>
      {product && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/70"
            onClick={onClose}
          />
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-0 bottom-0 z-40 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-zinc-800 bg-zinc-900 p-5 pb-8"
            role="dialog"
            aria-label={`Choose variant for ${product.name}`}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-zinc-50">
                {product.name}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="cursor-pointer rounded-full p-2 text-zinc-400 hover:text-amber-400"
              >
                <X size={24} />
              </button>
            </div>

            {(["oil", "spray"] as const).map((type) => {
              const variants = product.variants
                .filter((v) => v.type === type)
                .sort((a, b) => a.sizeMl - b.sizeMl);
              if (variants.length === 0) return null;

              return (
                <div key={type} className="mb-5">
                  <p className="mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                    {TYPE_LABEL[type]}
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {variants.map((variant) => {
                      const outOfStock = variant.stock <= 0;
                      const unavailable = !variant.isActive || outOfStock;
                      const lowStock =
                        !unavailable && variant.stock <= variant.lowStockThreshold;
                      return (
                        <button
                          key={variant.variantId}
                          type="button"
                          disabled={unavailable}
                          onClick={() => onSelect(product, variant)}
                          className={`flex min-h-16 flex-col items-start justify-center rounded-xl border px-4 py-3 text-left transition-colors ${
                            unavailable
                              ? "cursor-not-allowed border-zinc-800 bg-zinc-950 opacity-40"
                              : "cursor-pointer border-zinc-700 bg-zinc-800 active:border-amber-400 active:bg-zinc-700"
                          }`}
                        >
                          <span className="text-base font-semibold text-zinc-50">
                            {formatVariantLabel(variant.type, variant.sizeMl)} —{" "}
                            {formatInr(variant.priceInr)}
                          </span>
                          <span
                            className={`text-xs ${
                              unavailable
                                ? "text-red-400"
                                : lowStock
                                  ? "text-amber-400"
                                  : "text-zinc-500"
                            }`}
                          >
                            {!variant.isActive
                              ? "Not available"
                              : outOfStock
                                ? "Out of stock"
                                : `${variant.stock} left`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, X } from "lucide-react";
import type { Combo, Product } from "@/lib/firestore/types";
import { formatInr, maxAdditionalUnits } from "@/lib/pricing";

interface ComboPickerSheetProps {
  combo: Combo | null;
  products: Product[];
  onConfirm: (
    components: { productId: string; variantId: string; productName: string; variantLabel: string; qty: number }[],
    selections: { productId: string; variantId: string }[],
  ) => void;
  onClose: () => void;
}

export function ComboPickerSheet({ combo, products, onConfirm, onClose }: ComboPickerSheetProps) {
  const [picks, setPicks] = useState<Record<string, number>>({});

  useEffect(() => {
    setPicks({});
  }, [combo?.id]);

  if (!combo) return null;

  const productsById = new Map(products.map((p) => [p.id, p]));
  const chooseCount = combo.chooseCount ?? 0;
  const totalPicked = Object.values(picks).reduce((sum, n) => sum + n, 0);
  const complete = totalPicked === chooseCount;

  function keyOf(productId: string, variantId: string) {
    return `${productId}:${variantId}`;
  }
  function capacityFor(productId: string, variantId: string): number {
    const product = productsById.get(productId);
    const variant = product?.variants.find((v) => v.variantId === variantId);
    if (!product || !variant || !variant.isActive) return 0;
    return maxAdditionalUnits(product.oilStockMl, variant.oilMlPerUnit);
  }
  function adjust(productId: string, variantId: string, delta: number) {
    const key = keyOf(productId, variantId);
    setPicks((prev) => {
      const current = prev[key] ?? 0;
      const next = current + delta;
      if (next < 0) return prev;
      if (delta > 0 && totalPicked >= chooseCount) return prev;
      if (delta > 0 && next > capacityFor(productId, variantId)) return prev;
      return { ...prev, [key]: next };
    });
  }

  function handleConfirm() {
    const components = combo!.eligibleVariants
      .filter((v) => (picks[keyOf(v.productId, v.variantId)] ?? 0) > 0)
      .map((v) => ({
        productId: v.productId,
        variantId: v.variantId,
        productName: v.productName,
        variantLabel: v.variantLabel,
        qty: picks[keyOf(v.productId, v.variantId)] ?? 0,
      }));
    const selections = components.flatMap((c) =>
      Array.from({ length: c.qty }, () => ({ productId: c.productId, variantId: c.variantId })),
    );
    onConfirm(components, selections);
  }

  return (
    <AnimatePresence>
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
        aria-label={`Choose items for ${combo.title}`}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-zinc-50">{combo.title}</h2>
            <p className="text-sm text-amber-400">{formatInr(combo.comboPriceInr)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-full p-2 text-zinc-400 hover:text-amber-400"
          >
            <X size={24} />
          </button>
        </div>

        <div className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/5 px-4 py-2.5 text-sm text-zinc-200">
          {totalPicked} of {chooseCount} selected
        </div>

        <div className="flex flex-col gap-2">
          {combo.eligibleVariants.map((v) => {
            const key = keyOf(v.productId, v.variantId);
            const picked = picks[key] ?? 0;
            const capacity = capacityFor(v.productId, v.variantId);
            const outOfStock = capacity <= 0;
            return (
              <div
                key={key}
                className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
                  outOfStock ? "border-zinc-800 opacity-40" : "border-zinc-700 bg-zinc-800"
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-50">{v.productName}</p>
                  <p className="text-xs text-zinc-500">
                    {v.variantLabel}
                    {outOfStock && " · Out of stock"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center rounded-full border border-zinc-700">
                  <button
                    type="button"
                    aria-label={`Remove one ${v.productName} ${v.variantLabel}`}
                    onClick={() => adjust(v.productId, v.variantId, -1)}
                    disabled={picked === 0}
                    className="flex size-9 cursor-pointer items-center justify-center text-zinc-300 hover:text-amber-400 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="min-w-[1.5rem] text-center text-sm font-semibold text-zinc-50">
                    {picked}
                  </span>
                  <button
                    type="button"
                    aria-label={`Add one ${v.productName} ${v.variantLabel}`}
                    onClick={() => adjust(v.productId, v.variantId, 1)}
                    disabled={outOfStock || totalPicked >= chooseCount || picked >= capacity}
                    className="flex size-9 cursor-pointer items-center justify-center text-zinc-300 hover:text-amber-400 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={!complete}
          className="mt-5 flex h-14 w-full cursor-pointer items-center justify-center rounded-xl bg-amber-400 text-base font-bold text-zinc-950 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add to Bill
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Check, Minus, Package, Plus } from "lucide-react";
import { useCart } from "./cart-provider";
import { maxAdditionalUnits } from "@/lib/pricing";
import type { StoreCombo, StoreProduct } from "@/lib/store/queries";

export function ComboPicker({
  combo,
  products,
}: {
  combo: StoreCombo;
  products: StoreProduct[];
}) {
  const { addCombo } = useCart();
  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [added, setAdded] = useState(false);

  const chooseCount = combo.chooseCount ?? 0;
  const totalPicked = Object.values(picks).reduce((sum, n) => sum + n, 0);
  const complete = totalPicked === chooseCount;

  function capacityFor(productId: string, variantId: string): number {
    const product = productsById.get(productId);
    const variant = product?.variants.find((v) => v.variantId === variantId);
    if (!product || !variant || !product.isActive || !variant.isActive) return 0;
    return maxAdditionalUnits(product.oilStockMl, variant.oilMlPerUnit);
  }

  function keyOf(productId: string, variantId: string) {
    return `${productId}:${variantId}`;
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

  function handleAdd() {
    const components = combo.eligibleVariants
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

    addCombo(
      {
        comboId: combo.id,
        comboTitle: combo.title,
        components,
        selections,
      },
      combo.comboPriceInr,
      1,
    );
    setAdded(true);
    setPicks({});
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between rounded-lg border border-kiswa-gold/30 bg-kiswa-gold/5 px-4 py-3">
        <p className="text-sm text-kiswa-ink">
          <span className="font-display text-lg text-kiswa-gold">{totalPicked}</span> of{" "}
          {chooseCount} selected
        </p>
        {complete && <Check className="text-kiswa-gold" size={18} />}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {combo.eligibleVariants.map((v) => {
          const key = keyOf(v.productId, v.variantId);
          const picked = picks[key] ?? 0;
          const capacity = capacityFor(v.productId, v.variantId);
          const outOfStock = capacity <= 0;
          return (
            <div
              key={key}
              className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 ${
                outOfStock
                  ? "border-kiswa-border/50 opacity-40"
                  : "border-kiswa-border bg-kiswa-surface"
              }`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-kiswa-ink">{v.productName}</p>
                <p className="text-xs text-kiswa-ink-muted">
                  {v.variantLabel}
                  {outOfStock && " · Out of stock"}
                </p>
              </div>
              <div className="flex shrink-0 items-center rounded-full border border-kiswa-border">
                <button
                  type="button"
                  aria-label={`Remove one ${v.productName} ${v.variantLabel}`}
                  onClick={() => adjust(v.productId, v.variantId, -1)}
                  disabled={picked === 0}
                  className="flex size-9 cursor-pointer items-center justify-center text-kiswa-ink-muted hover:text-kiswa-gold disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Minus size={14} />
                </button>
                <span className="min-w-[1.5rem] text-center text-sm text-kiswa-ink">{picked}</span>
                <button
                  type="button"
                  aria-label={`Add one ${v.productName} ${v.variantLabel}`}
                  onClick={() => adjust(v.productId, v.variantId, 1)}
                  disabled={outOfStock || totalPicked >= chooseCount || picked >= capacity}
                  className="flex size-9 cursor-pointer items-center justify-center text-kiswa-ink-muted hover:text-kiswa-gold disabled:cursor-not-allowed disabled:opacity-30"
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
        onClick={handleAdd}
        disabled={!complete}
        className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-kiswa-gold text-sm font-medium tracking-wide text-kiswa-void transition-colors hover:bg-kiswa-gold-soft disabled:cursor-not-allowed disabled:opacity-50"
      >
        {added ? <Check size={16} /> : <Package size={16} />}
        {added ? "Added to Bag" : `Add Combo to Cart`}
      </button>
    </div>
  );
}

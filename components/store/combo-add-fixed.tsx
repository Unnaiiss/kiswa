"use client";

import { useState } from "react";
import { Check, Package } from "lucide-react";
import { useCart } from "./cart-provider";
import type { StoreCombo } from "@/lib/store/queries";

export function ComboAddFixed({
  combo,
  fulfillable,
}: {
  combo: StoreCombo;
  fulfillable: boolean;
}) {
  const { addCombo } = useCart();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addCombo(
      {
        comboId: combo.id,
        comboTitle: combo.title,
        components: combo.items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          productName: i.productName,
          variantLabel: i.variantLabel,
          qty: i.qty,
        })),
        selections: [],
      },
      combo.comboPriceInr,
      1,
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleAdd}
        disabled={!fulfillable}
        className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-kiswa-gold text-sm font-medium tracking-wide text-kiswa-void transition-colors hover:bg-kiswa-gold-soft disabled:cursor-not-allowed disabled:opacity-50"
      >
        {added ? <Check size={16} /> : <Package size={16} />}
        {fulfillable ? (added ? "Added to Bag" : "Add Combo to Cart") : "Currently Unavailable"}
      </button>
      {!fulfillable && (
        <p className="text-center text-xs text-kiswa-ink-muted">
          One or more items in this combo are out of stock right now.
        </p>
      )}
    </div>
  );
}


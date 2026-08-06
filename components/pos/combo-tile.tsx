"use client";

import { Package } from "lucide-react";
import { formatInr } from "@/lib/pricing";
import type { Combo } from "@/lib/firestore/types";

interface ComboTileProps {
  combo: Combo;
  fulfillable: boolean;
  onTap: () => void;
}

export function ComboTile({ combo, fulfillable, onTap }: ComboTileProps) {
  return (
    <button
      type="button"
      onClick={onTap}
      disabled={!fulfillable}
      className={`flex flex-col overflow-hidden rounded-xl border text-left transition-colors ${
        fulfillable
          ? "cursor-pointer border-amber-400/40 bg-amber-400/5 active:border-amber-400"
          : "cursor-not-allowed border-zinc-900 bg-zinc-950 opacity-50"
      }`}
    >
      <div className="relative aspect-square bg-zinc-900">
        {combo.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={combo.imageUrl} alt={combo.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="text-zinc-700" size={28} />
          </div>
        )}
        {!fulfillable && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/70">
            <span className="text-xs font-semibold uppercase tracking-wide text-red-400">
              Unavailable
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-3">
        <p className="line-clamp-2 text-sm leading-tight font-medium text-zinc-50">
          {combo.title}
        </p>
        <p className="text-sm font-semibold text-amber-400">{formatInr(combo.comboPriceInr)}</p>
      </div>
    </button>
  );
}

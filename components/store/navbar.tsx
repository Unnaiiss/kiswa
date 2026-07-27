"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "./cart-provider";

export function StoreNavbar() {
  const { count, open } = useCart();

  return (
    <header className="sticky top-0 z-40 border-b border-kiswa-border/80 bg-kiswa-void/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="font-display text-2xl tracking-[0.3em] text-kiswa-ink transition-colors hover:text-kiswa-gold"
        >
          KISWA
        </Link>

        <nav className="hidden items-center gap-8 text-sm tracking-wide text-kiswa-ink-muted sm:flex">
          <Link href="/" className="transition-colors hover:text-kiswa-gold">
            Home
          </Link>
          <Link
            href="/shop"
            className="transition-colors hover:text-kiswa-gold"
          >
            Shop
          </Link>
        </nav>

        <button
          type="button"
          onClick={open}
          aria-label="Open shopping bag"
          className="relative cursor-pointer rounded-full p-2 text-kiswa-ink transition-colors hover:text-kiswa-gold"
        >
          <ShoppingBag size={22} />
          {count > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-kiswa-gold px-1 text-[10px] font-semibold text-kiswa-void">
              {count}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}

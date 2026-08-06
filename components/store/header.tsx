"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, Search, ShoppingBag } from "lucide-react";
import { useCart } from "./cart-provider";
import { NavSearch } from "./nav-search";
import { MenuDrawer } from "./menu-drawer";
import { AnnouncementBar } from "./announcement-bar";
import type { StoreProduct } from "@/lib/store/queries";
import { cn } from "@/lib/utils";

export function StoreHeader({ products }: { products: StoreProduct[] }) {
  const { count, open: openCart } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <AnnouncementBar />

      <header
        className={cn(
          "sticky top-0 z-40 border-b transition-colors duration-300",
          scrolled
            ? "border-kiswa-border/80 bg-kiswa-void/85 backdrop-blur-md"
            : "border-transparent bg-transparent",
        )}
      >
        <div className="mx-auto grid h-nav max-w-6xl grid-cols-[auto_1fr_auto] items-center px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="flex h-11 w-11 cursor-pointer items-center justify-center text-kiswa-gold transition-colors hover:text-kiswa-gold-soft"
          >
            <Menu size={24} strokeWidth={1.5} />
          </button>

          <Link
            href="/"
            className="justify-self-center font-display text-xl tracking-[0.3em] text-kiswa-ink transition-colors hover:text-kiswa-gold sm:text-2xl"
          >
            KISWA
          </Link>

          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search fragrances"
              className="flex h-11 w-11 cursor-pointer items-center justify-center text-kiswa-gold transition-colors hover:text-kiswa-gold-soft"
            >
              <Search size={20} strokeWidth={1.5} />
            </button>

            <button
              type="button"
              onClick={openCart}
              aria-label="Open shopping bag"
              className="relative flex h-11 w-11 cursor-pointer items-center justify-center text-kiswa-gold transition-colors hover:text-kiswa-gold-soft"
            >
              <ShoppingBag size={20} strokeWidth={1.5} />
              {count > 0 && (
                <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-kiswa-gold px-1 text-[10px] font-semibold text-kiswa-void">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <MenuDrawer open={menuOpen} onOpenChange={setMenuOpen} />
      <NavSearch products={products} open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}

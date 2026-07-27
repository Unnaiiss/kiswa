"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, ShoppingBag } from "lucide-react";
import { useCart } from "./cart-provider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/#our-story", label: "Our Story" },
];

export function StoreNavbar() {
  const { count, open } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);

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
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-kiswa-gold"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
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

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              aria-label="Open menu"
              className="cursor-pointer rounded-full p-2 text-kiswa-ink transition-colors hover:text-kiswa-gold sm:hidden"
            >
              <Menu size={22} />
            </SheetTrigger>
            <SheetContent
              side="right"
              className="border-l border-kiswa-border bg-kiswa-void text-kiswa-ink"
            >
              <SheetHeader>
                <SheetTitle className="font-display text-lg tracking-[0.3em] text-kiswa-ink">
                  KISWA
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-2 py-3 text-base tracking-wide text-kiswa-ink-muted transition-colors hover:bg-kiswa-surface hover:text-kiswa-gold"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

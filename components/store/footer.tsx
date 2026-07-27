import Link from "next/link";

export function StoreFooter() {
  return (
    <footer className="border-t border-kiswa-border/80 bg-kiswa-void">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-12 text-center">
        <span className="font-display text-xl tracking-[0.3em] text-kiswa-ink">
          KISWA
        </span>
        <p className="max-w-md text-sm text-kiswa-ink-muted">
          Pure attar oils, and the sprays crafted from them. Made for those
          who wear fragrance like a second skin.
        </p>
        <nav className="flex gap-6 text-sm text-kiswa-ink-muted">
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
        <p className="text-xs text-kiswa-ink-muted/70">
          &copy; {new Date().getFullYear()} KISWA. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

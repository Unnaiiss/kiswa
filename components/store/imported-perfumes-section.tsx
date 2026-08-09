import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { StoreProduct } from "@/lib/store/queries";
import {
  DEFAULT_IMPORTED_HEADING,
  DEFAULT_IMPORTED_SUBLINE,
} from "@/lib/store/imported-section-defaults";
import { Reveal } from "./reveal";
import { FocusRail } from "./focus-rail";

interface ImportedPerfumesSectionProps {
  products: StoreProduct[];
  content: { isEnabled: boolean; heading: string; subline: string } | null;
}

/** The homepage's last section, showing admin-picked imported products (see
 * ImportedProductDoc.featuredOnHome/featuredOrder). Renders nothing at all —
 * no heading, no empty rail — when the section is disabled or there simply
 * aren't any featured/in-stock imported products right now, so the page
 * always flows cleanly into the footer either way. */
export function ImportedPerfumesSection({ products, content }: ImportedPerfumesSectionProps) {
  const isEnabled = content?.isEnabled ?? true;
  if (!isEnabled || products.length === 0) return null;

  const heading = content?.heading || DEFAULT_IMPORTED_HEADING;
  const subline = content?.subline || DEFAULT_IMPORTED_SUBLINE;

  return (
    <section className="border-t border-kiswa-border/80 bg-kiswa-surface px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mb-12 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-kiswa-gold-soft">
              From Abroad
            </p>
            <h2 className="mt-3 font-display text-4xl text-kiswa-ink sm:text-5xl">{heading}</h2>
            <p className="mt-3 max-w-md text-kiswa-ink-muted">{subline}</p>
          </div>
          <Link
            href="/shop?type=imported"
            className="group inline-flex shrink-0 items-center gap-1.5 text-sm tracking-wide text-kiswa-gold transition-colors hover:text-kiswa-gold-soft"
          >
            View All
            <ArrowRight
              size={15}
              className="transition-transform duration-300 ease-out group-hover:translate-x-1"
            />
          </Link>
        </Reveal>

        <FocusRail products={products} />
      </div>
    </section>
  );
}

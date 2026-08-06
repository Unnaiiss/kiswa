"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Package } from "lucide-react";
import { TiltCard } from "@/components/ui/tilt-card";
import { formatInr } from "@/lib/pricing";
import { comboSavings } from "@/lib/combos";
import type { StoreCombo } from "@/lib/store/queries";

export function ComboCard({ combo }: { combo: StoreCombo }) {
  const savings = comboSavings(combo.comboPriceInr, combo.originalPriceInr);

  return (
    <TiltCard>
      <motion.div
        whileHover={{ y: -6 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <Link href={`/offers/${combo.slug}`} className="group block">
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-kiswa-border bg-kiswa-surface">
            {combo.imageUrl ? (
              <motion.div
                className="h-full w-full"
                whileHover={{ scale: 1.06 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={combo.imageUrlMobile ?? combo.imageUrl}
                  alt={combo.title}
                  className="h-full w-full object-cover sm:hidden"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={combo.imageUrl}
                  alt={combo.title}
                  className="hidden h-full w-full object-cover sm:block"
                />
              </motion.div>
            ) : (
              <div className="relative flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_35%,var(--color-kiswa-surface-2),var(--color-kiswa-void))]">
                <div className="absolute inset-6 rounded-full border border-kiswa-gold/20" />
                <Package className="text-kiswa-gold/70" size={40} strokeWidth={1.25} />
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-kiswa-void/70 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            {combo.badgeText && (
              <span className="absolute left-3 top-3 rounded-full bg-kiswa-gold px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-kiswa-void">
                {combo.badgeText}
              </span>
            )}
          </div>
          <div className="mt-4 space-y-1">
            <h3 className="font-display text-lg text-kiswa-ink transition-colors group-hover:text-kiswa-gold">
              {combo.title}
            </h3>
            {combo.description && (
              <p className="line-clamp-2 text-xs text-kiswa-ink-muted">{combo.description}</p>
            )}
            <p className="flex items-baseline gap-2 text-sm">
              <span className="text-kiswa-gold">{formatInr(combo.comboPriceInr)}</span>
              {combo.originalPriceInr > combo.comboPriceInr && (
                <span className="text-kiswa-ink-muted line-through">
                  {formatInr(combo.originalPriceInr)}
                </span>
              )}
            </p>
            {savings.amount > 0 && (
              <p className="text-xs text-kiswa-gold-soft">
                Save {formatInr(savings.amount)} ({savings.percent}%)
              </p>
            )}
          </div>
        </Link>
      </motion.div>
    </TiltCard>
  );
}

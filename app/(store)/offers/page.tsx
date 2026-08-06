import type { Metadata } from "next";
import { Package } from "lucide-react";
import { getActiveCombos, getActiveProducts } from "@/lib/store/queries";
import { isComboFulfillable } from "@/lib/combos";
import { ComboCard } from "@/components/store/combo-card";
import { Reveal, StaggerGrid, StaggerItem } from "@/components/store/reveal";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Combo Offers — KISWA",
  description: "Bundle deals on KISWA attar oils and perfume sprays.",
};

export default async function OffersPage() {
  const [combos, products] = await Promise.all([getActiveCombos(), getActiveProducts()]);
  const productsById = new Map(products.map((p) => [p.id, p]));
  const available = combos.filter((combo) => isComboFulfillable(combo, productsById));

  return (
    <main className="flex-1 px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mb-14 flex flex-col items-center gap-3 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-kiswa-gold-soft">Offers</p>
          <h1 className="font-display text-4xl text-kiswa-ink sm:text-5xl">
            Combo Offers
          </h1>
          <p className="max-w-md text-kiswa-ink-muted">
            Bundle deals on our attar oils and perfume sprays, at a fixed price.
          </p>
        </Reveal>

        {available.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center text-kiswa-ink-muted">
            <Package size={32} />
            <p>No combo offers right now — check back soon.</p>
          </div>
        ) : (
          <StaggerGrid className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {available.map((combo) => (
              <StaggerItem key={combo.id}>
                <ComboCard combo={combo} />
              </StaggerItem>
            ))}
          </StaggerGrid>
        )}
      </div>
    </main>
  );
}

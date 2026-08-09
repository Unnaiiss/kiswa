import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Package } from "lucide-react";
import { getActiveProducts, getComboBySlug } from "@/lib/store/queries";
import { comboSavings, isComboFulfillable } from "@/lib/combos";
import { formatInr } from "@/lib/pricing";
import { Reveal } from "@/components/store/reveal";
import { ComboAddFixed } from "@/components/store/combo-add-fixed";
import { ComboPicker } from "@/components/store/combo-picker";

interface ComboPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ComboPageProps): Promise<Metadata> {
  const { slug } = await params;
  const combo = await getComboBySlug(slug);
  if (!combo) return {};
  return {
    title: combo.title,
    description: combo.description || "A KISWA combo offer.",
  };
}

export default async function ComboDetailPage({ params }: ComboPageProps) {
  const { slug } = await params;
  const [combo, products] = await Promise.all([getComboBySlug(slug), getActiveProducts()]);
  if (!combo) notFound();

  const productsById = new Map(products.map((p) => [p.id, p]));
  const fulfillable = isComboFulfillable(combo, productsById);
  const savings = comboSavings(combo.comboPriceInr, combo.originalPriceInr);

  return (
    <main className="flex-1 px-6 py-20 sm:py-28">
      <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-kiswa-border bg-kiswa-surface">
            {combo.imageUrl ? (
              <>
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
              </>
            ) : (
              <div className="relative flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_35%,var(--color-kiswa-surface-2),var(--color-kiswa-void))]">
                <div className="absolute inset-6 rounded-full border border-kiswa-gold/20" />
                <Package className="text-kiswa-gold/70" size={56} strokeWidth={1.25} />
              </div>
            )}
            {combo.badgeText && (
              <span className="absolute left-4 top-4 rounded-full bg-kiswa-gold px-3 py-1 text-xs font-semibold uppercase tracking-wide text-kiswa-void">
                {combo.badgeText}
              </span>
            )}
          </div>
        </Reveal>

        <div>
          <Reveal>
            <p className="text-xs uppercase tracking-[0.4em] text-kiswa-gold-soft">
              {combo.type === "fixed" ? "Bundle Offer" : "Build Your Own"}
            </p>
            <h1 className="mt-3 font-display text-3xl text-kiswa-ink sm:text-4xl">
              {combo.title}
            </h1>
            {combo.description && (
              <p className="mt-4 text-kiswa-ink-muted">{combo.description}</p>
            )}

            <div className="mt-6 flex items-baseline gap-3">
              <span className="font-display text-3xl text-kiswa-gold">
                {formatInr(combo.comboPriceInr)}
              </span>
              {combo.originalPriceInr > combo.comboPriceInr && (
                <span className="text-lg text-kiswa-ink-muted line-through">
                  {formatInr(combo.originalPriceInr)}
                </span>
              )}
            </div>
            {savings.amount > 0 && (
              <p className="mt-1 text-sm text-kiswa-gold-soft">
                You save {formatInr(savings.amount)} ({savings.percent}%)
              </p>
            )}
          </Reveal>

          {combo.type === "fixed" ? (
            <Reveal delay={0.1}>
              <div className="mt-8 flex flex-col gap-6">
                <div>
                  <p className="mb-2 text-xs uppercase tracking-wide text-kiswa-ink-muted">
                    What&apos;s included
                  </p>
                  <ul className="flex flex-col gap-2">
                    {combo.items.map((item, idx) => (
                      <li
                        key={`${item.productId}-${item.variantId}-${idx}`}
                        className="flex items-center justify-between rounded-lg border border-kiswa-border bg-kiswa-surface px-4 py-2.5 text-sm"
                      >
                        <span className="text-kiswa-ink">{item.productName}</span>
                        <span className="text-kiswa-ink-muted">
                          {item.variantLabel} × {item.qty}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <ComboAddFixed combo={combo} fulfillable={fulfillable} />
              </div>
            </Reveal>
          ) : (
            <Reveal delay={0.1}>
              <div className="mt-8">
                <p className="mb-3 text-xs uppercase tracking-wide text-kiswa-ink-muted">
                  Choose {combo.chooseCount} from the list below
                </p>
                <ComboPicker combo={combo} products={products} />
              </div>
            </Reveal>
          )}
        </div>
      </div>
    </main>
  );
}

import { Gift, MessageSquareHeart, PackageOpen } from "lucide-react";
import type { StoreGiftSection } from "@/lib/store/queries";
import {
  DEFAULT_GIFT_BODY,
  DEFAULT_GIFT_BUTTON_LABEL,
  DEFAULT_GIFT_HEADING,
} from "@/lib/store/gift-section-defaults";
import { Reveal } from "./reveal";
import { RevealText } from "@/components/ui/reveal-text";
import { FlowButton } from "@/components/ui/flow-button";

const BENEFITS = [
  { icon: PackageOpen, label: "Free gift wrapping" },
  { icon: MessageSquareHeart, label: "Personal message card" },
  { icon: Gift, label: "Price never shown to the recipient" },
];

export function GiftSection({ content }: { content: StoreGiftSection | null }) {
  const heading = content?.heading || DEFAULT_GIFT_HEADING;
  const body = content?.body || DEFAULT_GIFT_BODY;
  const buttonLabel = content?.buttonLabel || DEFAULT_GIFT_BUTTON_LABEL;
  const imageUrl = content?.imageUrl || null;
  const imageUrlMobile = content?.imageUrlMobile || imageUrl;

  return (
    <section className="border-t border-kiswa-border/80 bg-kiswa-void px-6 py-24 sm:py-32">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
        <Reveal>
          <div className="relative aspect-[4/5] overflow-hidden rounded-lg border border-kiswa-border bg-kiswa-surface sm:aspect-[16/10] lg:aspect-[4/5]">
            {imageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrlMobile ?? imageUrl}
                  alt="A KISWA fragrance wrapped as a gift"
                  className="h-full w-full object-cover lg:hidden"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="A KISWA fragrance wrapped as a gift"
                  className="hidden h-full w-full object-cover lg:block"
                />
              </>
            ) : (
              <div className="relative flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_35%,var(--color-kiswa-surface-2),var(--color-kiswa-void))]">
                <div className="absolute inset-6 rounded-full border border-kiswa-gold/20" />
                <Gift className="text-kiswa-gold/70" size={64} strokeWidth={1.25} />
              </div>
            )}
          </div>
        </Reveal>

        <div>
          <Reveal>
            <p className="text-xs uppercase tracking-[0.4em] text-kiswa-gold-soft">
              Gifting
            </p>
          </Reveal>
          <RevealText
            text={heading}
            className="mt-4 font-display text-4xl leading-tight text-kiswa-ink sm:text-5xl"
          />
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-lg text-kiswa-ink-muted">{body}</p>
          </Reveal>

          <Reveal delay={0.2}>
            <ul className="mt-8 flex flex-col gap-4">
              {BENEFITS.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-kiswa-gold/30 bg-kiswa-gold/10">
                    <Icon className="text-kiswa-gold" size={16} />
                  </span>
                  <span className="text-sm text-kiswa-ink">{label}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="mt-10">
              <FlowButton href="/gift">{buttonLabel}</FlowButton>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

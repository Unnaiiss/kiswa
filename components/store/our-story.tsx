import { Droplet, SprayCan } from "lucide-react";
import { Reveal } from "./reveal";

export function OurStory() {
  return (
    <section className="border-t border-kiswa-border/80 bg-kiswa-void px-6 py-24 sm:py-32">
      <div className="mx-auto grid max-w-6xl gap-16 lg:grid-cols-2 lg:items-center">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.4em] text-kiswa-gold-soft">
            Our Story
          </p>
          <h2 className="mt-4 font-display text-4xl leading-tight text-kiswa-ink sm:text-5xl">
            One fragrance,
            <br />
            two ways to wear it.
          </h2>
          <p className="mt-6 max-w-lg text-kiswa-ink-muted">
            Every KISWA fragrance begins as a pure attar oil — alcohol-free,
            concentrated, and long-wearing on the skin. From that same oil, we
            distill a fine spray for those who prefer the lightness of a
            perfume mist. Same soul, two rituals.
          </p>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-kiswa-border bg-kiswa-surface p-8">
              <Droplet className="text-kiswa-gold" size={28} />
              <h3 className="mt-4 font-display text-xl text-kiswa-ink">
                Perfume Oil
              </h3>
              <p className="mt-2 text-sm text-kiswa-ink-muted">
                Concentrated attar, applied direct to the skin. Slow to
                open, long to fade.
              </p>
            </div>
            <div className="rounded-lg border border-kiswa-border bg-kiswa-surface p-8 sm:mt-8">
              <SprayCan className="text-kiswa-gold" size={28} />
              <h3 className="mt-4 font-display text-xl text-kiswa-ink">
                Perfume Spray
              </h3>
              <p className="mt-2 text-sm text-kiswa-ink-muted">
                The same blend, lightened into a fine mist for everyday
                wear.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

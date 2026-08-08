"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Package } from "lucide-react";
import { formatInr } from "@/lib/pricing";
import type { StoreBanner } from "@/lib/store/queries";

type StoreComboBanner = Extract<StoreBanner, { bannerType: "combo" }>;
type StoreImageBanner = Extract<StoreBanner, { bannerType: "image" }>;

const AUTO_ADVANCE_MS = 2000;
const SLIDE_TRANSITION_S = 0.45;
const SWIPE_THRESHOLD_PX = 50;

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function useTabHidden() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);
  return hidden;
}

const BUTTON_POSITION_CLASSES: Record<string, string> = {
  "bottom-center":
    "absolute inset-x-0 bottom-14 z-20 flex justify-center px-4 pointer-events-none sm:bottom-16",
  "bottom-left":
    "absolute inset-x-0 bottom-14 z-20 flex justify-start pl-4 pointer-events-none sm:bottom-16 sm:pl-6",
  center: "absolute inset-0 z-20 flex items-center justify-center px-6 pointer-events-none",
};

function BannerCtaButton({ banner }: { banner: StoreImageBanner }) {
  if (!banner.buttonEnabled || !banner.buttonLabel || !banner.buttonLink) return null;

  const buttonClass =
    "pointer-events-auto flex min-h-11 items-center justify-center rounded-full border border-kiswa-gold/50 bg-kiswa-void/55 px-6 py-3 text-sm font-medium tracking-wide text-kiswa-gold-soft backdrop-blur-md transition-colors hover:bg-kiswa-gold hover:text-kiswa-void";
  const positionClass =
    BUTTON_POSITION_CLASSES[banner.buttonPosition] ?? BUTTON_POSITION_CLASSES["bottom-center"];

  // A sibling of the slide's own <Link>/<a> (never nested inside it), so a
  // click here can never bubble into and double-trigger the slide's own
  // link — stopPropagation below is defense-in-depth on top of that.
  return (
    <div className={positionClass}>
      {banner.buttonLink.startsWith("/") ? (
        <Link
          href={banner.buttonLink}
          className={buttonClass}
          onClick={(e) => e.stopPropagation()}
        >
          {banner.buttonLabel}
        </Link>
      ) : (
        <a
          href={banner.buttonLink}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass}
          onClick={(e) => e.stopPropagation()}
        >
          {banner.buttonLabel}
        </a>
      )}
    </div>
  );
}

function BannerSlideImages({
  banner,
  priority,
  onLoad,
}: {
  banner: StoreImageBanner;
  priority: boolean;
  onLoad: () => void;
}) {
  const mobileSrc = banner.imageUrlMobile ?? banner.imageUrl;
  return (
    <>
      <div className="absolute inset-0 md:hidden">
        <Image
          src={mobileSrc}
          alt={banner.altText}
          fill
          sizes="100vw"
          priority={priority}
          className="object-cover"
          onLoad={onLoad}
        />
      </div>
      <div className="absolute inset-0 hidden md:block">
        <Image
          src={banner.imageUrl}
          alt={banner.altText}
          fill
          sizes="100vw"
          priority={priority}
          className="object-cover"
          onLoad={onLoad}
        />
      </div>
    </>
  );
}

function ComboBannerImage({
  combo,
  priority,
  onLoad,
}: {
  combo: StoreComboBanner["combo"];
  priority: boolean;
  onLoad: () => void;
}) {
  // No stock photo on this combo — nothing to wait on, so fire onLoad right
  // away instead of leaving the loading skeleton stuck forever. The hook is
  // called unconditionally (rules-of-hooks); only its body branches.
  useEffect(() => {
    if (!combo.imageUrl) onLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combo.imageUrl]);

  if (!combo.imageUrl) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_35%,var(--color-kiswa-surface-2),var(--color-kiswa-void))]">
        <Package className="text-kiswa-gold/70" size={56} strokeWidth={1.25} />
      </div>
    );
  }
  const mobileSrc = combo.imageUrlMobile ?? combo.imageUrl;
  return (
    <>
      <div className="absolute inset-0 md:hidden">
        <Image
          src={mobileSrc}
          alt={combo.title}
          fill
          sizes="100vw"
          priority={priority}
          className="object-cover"
          onLoad={onLoad}
        />
      </div>
      <div className="absolute inset-0 hidden md:block">
        <Image
          src={combo.imageUrl}
          alt={combo.title}
          fill
          sizes="100vw"
          priority={priority}
          className="object-cover"
          onLoad={onLoad}
        />
      </div>
    </>
  );
}

/** A slide generated live from a combo's own data — image, title,
 * description, price (with the original struck through), and savings badge
 * all read fresh from the resolved combo (see getActiveBanners), so editing
 * the combo in admin updates this slide with no re-save. The CTA button is a
 * sibling of the slide-level Link (never nested inside it, same as
 * BannerCtaButton above) so it can never double-trigger navigation, and both
 * point at the same /offers/[slug] destination regardless. */
function ComboBannerSlide({
  banner,
  priority,
  onLoad,
}: {
  banner: StoreComboBanner;
  priority: boolean;
  onLoad: () => void;
}) {
  const { combo } = banner;
  const headline = banner.headlineOverride || combo.title;
  const buttonLabel = banner.buttonLabelOverride || "Shop This Combo";
  const href = `/offers/${combo.slug}`;

  return (
    <>
      <Link href={href} className="absolute inset-0" aria-label={headline}>
        <ComboBannerImage combo={combo} priority={priority} onLoad={onLoad} />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-kiswa-void/90 via-kiswa-void/30 to-transparent"
        />
        {combo.badgeText && (
          <span className="absolute left-4 top-4 z-10 rounded-full bg-kiswa-gold px-3 py-1 text-xs font-semibold uppercase tracking-wide text-kiswa-void">
            {combo.badgeText}
          </span>
        )}
        <div className="absolute inset-x-0 bottom-28 z-10 flex flex-col gap-1.5 px-5 sm:bottom-32 sm:px-8">
          <h3 className="font-display text-xl text-white drop-shadow-sm sm:text-3xl">
            {headline}
          </h3>
          {combo.description && (
            <p className="line-clamp-2 max-w-md text-xs text-white/80 sm:text-sm">
              {combo.description}
            </p>
          )}
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="text-lg font-semibold text-kiswa-gold sm:text-2xl">
              {formatInr(combo.comboPriceInr)}
            </span>
            {combo.originalPriceInr > combo.comboPriceInr && (
              <span className="text-sm text-white/60 line-through">
                {formatInr(combo.originalPriceInr)}
              </span>
            )}
          </div>
        </div>
      </Link>
      {/* Same bottom offset BannerCtaButton uses for image banners
          ("bottom-center") — proven clear of the dot indicators below it. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-14 z-20 flex justify-center px-5 sm:bottom-16 sm:justify-start sm:px-8">
        <Link
          href={href}
          onClick={(e) => e.stopPropagation()}
          className="pointer-events-auto flex min-h-11 items-center justify-center rounded-full border border-kiswa-gold/50 bg-kiswa-void/55 px-6 py-2.5 text-sm font-medium tracking-wide text-kiswa-gold-soft backdrop-blur-md transition-colors hover:bg-kiswa-gold hover:text-kiswa-void"
        >
          {buttonLabel}
        </Link>
      </div>
    </>
  );
}

export function BannerCarousel({ banners }: { banners: StoreBanner[] }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [paused, setPaused] = useState(false);
  const [firstLoaded, setFirstLoaded] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const reducedMotion = useReducedMotion();
  const tabHidden = useTabHidden();

  const count = banners.length;

  function goTo(next: number, dir: 1 | -1) {
    setDirection(dir);
    setIndex(((next % count) + count) % count);
  }
  function goNext() {
    goTo(index + 1, 1);
  }
  function goPrev() {
    goTo(index - 1, -1);
  }

  useEffect(() => {
    if (count <= 1 || paused || reducedMotion || tabHidden) return;
    const id = setInterval(goNext, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, count, paused, reducedMotion, tabHidden]);

  if (count === 0) return null;

  const current = banners[index];

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    setPaused(true);
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current !== null) {
      const delta = e.changedTouches[0].clientX - touchStartX.current;
      if (delta < -SWIPE_THRESHOLD_PX) goNext();
      else if (delta > SWIPE_THRESHOLD_PX) goPrev();
    }
    touchStartX.current = null;
    setPaused(false);
  }

  return (
    <div className="w-full px-[5%] pt-3 sm:px-[6%] md:mx-auto md:max-w-[1200px] md:px-6 md:pt-4">
      <section
        className="group relative w-full overflow-hidden rounded-[20px] bg-kiswa-surface shadow-[0_16px_40px_-18px_rgba(0,0,0,0.5)] aspect-[3/4] md:aspect-[16/9] md:rounded-[28px]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {!firstLoaded && (
          <div className="absolute inset-0 z-10 animate-pulse bg-kiswa-surface-2" />
        )}

        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={current.id}
            custom={direction}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: direction * -40 }}
            transition={{ duration: SLIDE_TRANSITION_S, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0"
          >
            {current.bannerType === "combo" ? (
              <ComboBannerSlide
                banner={current}
                priority={index === 0}
                onLoad={() => setFirstLoaded(true)}
              />
            ) : (
              <>
                {current.linkUrl ? (
                  current.linkUrl.startsWith("/") ? (
                    <Link
                      href={current.linkUrl}
                      className="absolute inset-0"
                      aria-label={current.altText}
                    >
                      <BannerSlideImages
                        banner={current}
                        priority={index === 0}
                        onLoad={() => setFirstLoaded(true)}
                      />
                    </Link>
                  ) : (
                    <a
                      href={current.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute inset-0"
                      aria-label={current.altText}
                    >
                      <BannerSlideImages
                        banner={current}
                        priority={index === 0}
                        onLoad={() => setFirstLoaded(true)}
                      />
                    </a>
                  )
                ) : (
                  <BannerSlideImages
                    banner={current}
                    priority={index === 0}
                    onLoad={() => setFirstLoaded(true)}
                  />
                )}
                <BannerCtaButton banner={current} />
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous banner"
              className="absolute top-1/2 left-3 z-20 hidden h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-kiswa-ink/20 bg-kiswa-void/50 text-kiswa-ink opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 md:flex"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next banner"
              className="absolute top-1/2 right-3 z-20 hidden h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-kiswa-ink/20 bg-kiswa-void/50 text-kiswa-ink opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 md:flex"
            >
              <ChevronRight size={20} />
            </button>

            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-gradient-to-t from-black/35 to-transparent"
            />

            <div className="absolute inset-x-0 bottom-2 z-20 flex justify-center">
              {banners.map((banner, i) => (
                <button
                  key={banner.id}
                  type="button"
                  onClick={() => goTo(i, i > index ? 1 : -1)}
                  aria-label={`Go to banner ${i + 1}`}
                  className="flex h-11 w-8 cursor-pointer items-center justify-center"
                >
                  <span
                    className={`block h-1.5 rounded-full transition-all ${
                      i === index ? "w-5 bg-kiswa-gold" : "w-1.5 bg-white/50"
                    }`}
                  />
                </button>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

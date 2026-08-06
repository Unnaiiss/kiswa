"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { StoreBanner } from "@/lib/store/queries";

const AUTO_ADVANCE_MS = 5000;
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

function BannerSlideImages({
  banner,
  priority,
  onLoad,
}: {
  banner: StoreBanner;
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

  const slideContent = (
    <BannerSlideImages
      banner={current}
      priority={index === 0}
      onLoad={() => setFirstLoaded(true)}
    />
  );

  return (
    <section
      className="group relative w-full overflow-hidden bg-kiswa-surface aspect-[1080/1350] md:aspect-[1920/800]"
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
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0"
        >
          {current.linkUrl ? (
            current.linkUrl.startsWith("/") ? (
              <Link href={current.linkUrl} className="absolute inset-0" aria-label={current.altText}>
                {slideContent}
              </Link>
            ) : (
              <a
                href={current.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0"
                aria-label={current.altText}
              >
                {slideContent}
              </a>
            )
          ) : (
            slideContent
          )}
        </motion.div>
      </AnimatePresence>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous banner"
            className="absolute top-1/2 left-3 z-20 hidden h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-kiswa-ink/20 bg-kiswa-void/50 text-kiswa-ink opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 sm:flex"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Next banner"
            className="absolute top-1/2 right-3 z-20 hidden h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-kiswa-ink/20 bg-kiswa-void/50 text-kiswa-ink opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 sm:flex"
          >
            <ChevronRight size={20} />
          </button>

          <div className="absolute inset-x-0 bottom-4 z-20 flex justify-center gap-2">
            {banners.map((banner, i) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => goTo(i, i > index ? 1 : -1)}
                aria-label={`Go to banner ${i + 1}`}
                className={`h-2 cursor-pointer rounded-full transition-all ${
                  i === index ? "w-6 bg-kiswa-gold" : "w-2 bg-kiswa-ink/40 hover:bg-kiswa-ink/60"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

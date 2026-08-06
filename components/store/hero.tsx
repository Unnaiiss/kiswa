"use client";

import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { LiquidMetalButton } from "@/components/ui/liquid-metal";
import { RevealText } from "@/components/ui/reveal-text";
import { BlurText } from "@/components/ui/blur-text";

const HERO_IMAGE =
  "https://d8j0ntlcm91z4.cloudfront.net/user_3G2BPvJuU219Rz233nDUIH1DzQY/hf_20260727_201831_f976fb6c-0a9c-4a6a-ae46-38944dd0b73c.png";

const HEADLINE_LINES = ["Luxury Attar", "Timeless Elegance", "Pure Oud & Musk"];

const eyebrow: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

export function Hero() {
  const router = useRouter();

  return (
    <section className="relative -mt-nav flex min-h-screen items-center overflow-hidden bg-kiswa-void">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={HERO_IMAGE}
        alt="KISWA signature attar bottle"
        className="absolute inset-0 h-full w-full object-cover object-right"
      />
      {/* Dark on the left for text legibility, fading out so the bottle on
          the right stays bright — reversed from a centered/symmetric hero. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-kiswa-void via-kiswa-void/85 to-transparent sm:via-kiswa-void/75"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-kiswa-void via-transparent to-transparent"
      />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pt-nav">
        <div className="max-w-xl">
          <motion.span
            variants={eyebrow}
            initial="hidden"
            animate="show"
            className="mb-6 block text-xs uppercase tracking-[0.5em] text-kiswa-gold-soft"
          >
            Pure Attar &middot; Est. India
          </motion.span>

          {/* Visually-hidden real heading for SEO/a11y; the decorative
              multi-line reveal below duplicates it for sighted users. */}
          <h1 className="sr-only">
            KISWA — Luxury Attar Oils &amp; Perfume Sprays, Timeless Elegance
            in Pure Oud &amp; Musk
          </h1>
          <div aria-hidden="true">
            {HEADLINE_LINES.map((line, i) => (
              <RevealText
                key={line}
                text={line}
                delay={i * 0.18}
                className="font-display text-5xl font-black leading-[1.05] text-kiswa-ink sm:text-6xl lg:text-7xl"
              />
            ))}
          </div>

          <BlurText
            text="Discover handcrafted attar oils and the fine perfume sprays distilled from them — blended with pure oud, musk, and rare essences for fragrance that tells a story of tradition and sophistication."
            className="mt-6 max-w-md text-balance text-kiswa-ink-muted sm:text-lg"
          />

          <div className="mt-10">
            <LiquidMetalButton
              onClick={() => router.push("/shop")}
              icon={<ArrowRight size={18} />}
              metalConfig={{
                colorBack: "#4a3a12",
                colorTint: "#e8c96a",
                speed: 0.4,
                repetition: 4,
                distortion: 0.15,
              }}
            >
              Explore Our Collection
            </LiquidMetalButton>
          </div>
        </div>
      </div>
    </section>
  );
}

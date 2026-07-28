"use client";

import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { LiquidMetalButton } from "@/components/ui/liquid-metal";

const HERO_IMAGE =
  "https://d8j0ntlcm91z4.cloudfront.net/user_3G2BPvJuU219Rz233nDUIH1DzQY/hf_20260727_201831_f976fb6c-0a9c-4a6a-ae46-38944dd0b73c.png";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15, delayChildren: 0.1 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
  },
};

export function Hero() {
  const router = useRouter();

  return (
    <section className="relative -mt-nav flex min-h-screen items-center justify-center overflow-hidden bg-kiswa-void">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={HERO_IMAGE}
        alt="KISWA signature attar bottle"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-kiswa-void via-kiswa-void/70 to-kiswa-void/20"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-kiswa-void/80 via-kiswa-void/20 to-kiswa-void/60"
      />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 flex flex-col items-center gap-6 px-6 text-center"
      >
        <motion.span
          variants={item}
          className="text-xs uppercase tracking-[0.5em] text-kiswa-gold-soft"
        >
          Pure Attar &middot; Est. India
        </motion.span>

        <motion.div
          variants={item}
          className="h-px w-24 bg-gradient-to-r from-transparent via-kiswa-gold to-transparent"
        />

        <motion.p
          variants={item}
          className="max-w-md text-balance text-base text-kiswa-ink-muted drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)] sm:text-lg"
        >
          Concentrated attar oils, and the fine sprays distilled from them.
          Fragrance worn like a second skin.
        </motion.p>

        <motion.div variants={item} className="mt-4">
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
            Explore the Collection
          </LiquidMetalButton>
        </motion.div>
      </motion.div>
    </section>
  );
}

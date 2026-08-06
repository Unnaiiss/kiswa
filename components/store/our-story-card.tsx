"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Droplet, SprayCan } from "lucide-react";
import { TiltCard } from "@/components/ui/tilt-card";

const ICONS = { oil: Droplet, spray: SprayCan };

interface OurStoryCardProps {
  variant: "oil" | "spray";
  title: string;
  description: string;
  imageUrl: string | null;
  imageUrlMobile: string | null;
  alt: string;
  className?: string;
}

// Mirrors ProductCard's TiltCard + hover-zoom-image pattern so the "existing
// tilt-card hover effect" (3D pointer tilt, disabled on touch/coarse
// pointers) carries over here unchanged. Takes `variant` rather than an icon
// component prop since this is a Client Component rendered from a Server
// Component parent — a component reference can't cross that boundary as a
// plain prop, but a string discriminant can.
export function OurStoryCard({
  variant,
  title,
  description,
  imageUrl,
  imageUrlMobile,
  alt,
  className = "",
}: OurStoryCardProps) {
  const [loaded, setLoaded] = useState(false);
  const mobileSrc = imageUrlMobile ?? imageUrl;
  const Icon = ICONS[variant];

  return (
    <TiltCard className={className}>
      <div className="flex h-full flex-col rounded-lg border border-kiswa-border bg-kiswa-surface">
        <div className="group relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-t-lg">
          {imageUrl ? (
            <>
              {!loaded && (
                <div className="absolute inset-0 animate-pulse bg-kiswa-surface-2" />
              )}
              <motion.div
                className="h-full w-full"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <Image
                  src={mobileSrc ?? imageUrl}
                  alt={alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover md:hidden"
                  onLoad={() => setLoaded(true)}
                />
                <Image
                  src={imageUrl}
                  alt={alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="hidden object-cover md:block"
                  onLoad={() => setLoaded(true)}
                />
              </motion.div>
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-kiswa-surface to-transparent"
              />
            </>
          ) : (
            <div className="relative flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_35%,var(--color-kiswa-surface-2),var(--color-kiswa-void))]">
              <div className="absolute inset-6 rounded-full border border-kiswa-gold/20" />
              <Icon className="text-kiswa-gold/70" size={40} strokeWidth={1.25} />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-8">
          <Icon className="text-kiswa-gold" size={28} />
          <h3 className="mt-4 font-display text-xl text-kiswa-ink">{title}</h3>
          <p className="mt-2 text-sm text-kiswa-ink-muted">{description}</p>
        </div>
      </div>
    </TiltCard>
  );
}

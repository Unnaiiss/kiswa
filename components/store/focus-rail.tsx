"use client";

import { useEffect, useRef, useState } from "react";
import Autoplay from "embla-carousel-autoplay";
import type { StoreProduct } from "@/lib/store/queries";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { ProductCard } from "./product-card";

// A horizontal rail where the leading/active card sits at full scale and
// opacity while its neighbors recede slightly, so attention "focuses" on one
// fragrance at a time as you drag, use the arrows, or just let it play.
export function FocusRail({ products }: { products: StoreProduct[] }) {
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);
  // A ref (not state) so the plugin instance is created exactly once and
  // never recreated across re-renders — embla's own recommended pattern,
  // since passing a fresh plugin object every render would restart autoplay
  // each time. Advances one product at a time to the right; stopOnInteraction:
  // false means a manual drag/arrow tap doesn't permanently kill it, just
  // pauses/resets the timer, and stopOnMouseEnter pauses it while a visitor
  // is actually looking at a card rather than fighting their cursor.
  const autoplay = useRef(
    Autoplay({ delay: 3200, stopOnInteraction: false, stopOnMouseEnter: true }),
  );

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setSelected(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  return (
    <Carousel
      setApi={setApi}
      opts={{ align: "start", dragFree: true, loop: true }}
      plugins={[autoplay.current]}
      className="w-full"
    >
      <CarouselContent className="-ml-6">
        {products.map((product, index) => (
          <CarouselItem
            key={product.id}
            className="basis-[72%] pl-6 sm:basis-1/2 lg:basis-1/3 xl:basis-1/4"
          >
            <div
              className="transition-all duration-500 ease-out"
              style={{
                transform: index === selected ? "scale(1)" : "scale(0.93)",
                opacity: index === selected ? 1 : 0.55,
              }}
            >
              <ProductCard product={product} />
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>

      <div className="mt-10 flex justify-center gap-3">
        <CarouselPrevious className="static size-10 -translate-y-0 border-kiswa-gold/40 bg-transparent text-kiswa-gold hover:bg-kiswa-gold hover:text-kiswa-void" />
        <CarouselNext className="static size-10 -translate-y-0 border-kiswa-gold/40 bg-transparent text-kiswa-gold hover:bg-kiswa-gold hover:text-kiswa-void" />
      </div>
    </Carousel>
  );
}

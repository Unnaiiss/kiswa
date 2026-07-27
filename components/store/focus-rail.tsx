"use client";

import { useEffect, useState } from "react";
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
// fragrance at a time as you drag or use the arrows.
export function FocusRail({ products }: { products: StoreProduct[] }) {
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);

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
      opts={{ align: "start", dragFree: true }}
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

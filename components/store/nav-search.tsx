"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { StoreProduct } from "@/lib/store/queries";
import { formatInr } from "@/lib/pricing";
import { productDisplayPrice } from "@/lib/products";
import { ProductImage } from "./product-image";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const MAX_RESULTS = 20;

export function NavSearch({
  products,
  open,
  onOpenChange,
}: {
  products: StoreProduct[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        onOpenChange(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    const pool = term
      ? products.filter((p) => p.name.toLowerCase().includes(term))
      : products;
    return [...pool]
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, MAX_RESULTS);
  }, [products, query]);

  function goToProduct(slug: string) {
    onOpenChange(false);
    router.push(`/product/${slug}`);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search fragrances"
      description="Search the KISWA collection by name."
      className="border border-kiswa-border bg-kiswa-surface text-kiswa-ink"
    >
      <Command
        shouldFilter={false}
        className="bg-transparent text-kiswa-ink"
      >
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search fragrances by name..."
          className="text-kiswa-ink placeholder:text-kiswa-ink-muted"
        />
        <CommandList>
          <CommandEmpty className="py-8 text-center text-sm text-kiswa-ink-muted">
            No fragrances found.
          </CommandEmpty>
          {results.length > 0 && (
            <CommandGroup
              heading="Fragrances"
              className="text-kiswa-ink-muted"
            >
              {results.map((product) => (
                <CommandItem
                  key={product.id}
                  value={product.id}
                  onSelect={() => goToProduct(product.slug)}
                  className="cursor-pointer gap-3 text-kiswa-ink data-selected:bg-kiswa-surface-2 data-selected:text-kiswa-gold"
                >
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-kiswa-border">
                    <ProductImage
                      name={product.name}
                      imageUrls={product.imageUrls}
                      className="h-full w-full"
                      sizes="40px"
                    />
                  </div>
                  <div className="flex flex-1 flex-col overflow-hidden">
                    <span className="truncate">{product.name}</span>
                    <span className="text-xs text-kiswa-gold-soft">
                      {product.productType === "imported"
                        ? formatInr(productDisplayPrice(product))
                        : `From ${formatInr(productDisplayPrice(product))}`}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

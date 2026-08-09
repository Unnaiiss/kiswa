"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Droplet, Gift, Minus, Plus, SprayCan } from "lucide-react";
import type { VariantType } from "@/lib/firestore/types";
import type { GiftDetails } from "@/lib/cart/types";
import type { StoreProduct } from "@/lib/store/queries";
import { formatInr, formatVariantLabel, maxAdditionalUnits } from "@/lib/pricing";
import { buildProductOrderMessage, buildWhatsAppUrl, useSiteUrl } from "@/lib/whatsapp";
import { useSiteSettings } from "@/lib/store/site-settings-context";
import { useCart } from "./cart-provider";
import { GiftDialog } from "./gift-dialog";
import { WhatsAppIcon } from "./whatsapp-icon";

const TYPE_META: Record<
  VariantType,
  { label: string; caption: string; icon: typeof Droplet }
> = {
  oil: {
    label: "Perfume Oil",
    caption: "Concentrated attar, worn direct on skin",
    icon: Droplet,
  },
  spray: {
    label: "Perfume Spray",
    caption: "A fine mist, lightened for everyday wear",
    icon: SprayCan,
  },
};

export function VariantSelector({
  product,
  giftMode = false,
}: {
  /** Always an attar product — the product page renders ImportedBuyBox
   * instead for imported products, which have no variants to select. */
  product: StoreProduct & { productType: "attar" };
  /** True when navigated here from /gift — makes "Send as Gift" the primary
   * CTA instead of "Add to Bag" (both stay available either way). */
  giftMode?: boolean;
}) {
  const { items, addItem, open } = useCart();

  // Every variant of this product is bottled from the same oil pool, so oil
  // already committed to OTHER lines of this product in the cart (any
  // variant, including this one) reduces what's left to add right now.
  const mlCommittedInCart = useMemo(
    () =>
      items
        .filter((line) => line.productId === product.id)
        .reduce((sum, line) => sum + line.qty * line.oilMlPerUnit, 0),
    [items, product.id],
  );
  const remainingMl = product.oilStockMl - mlCommittedInCart;
  const lowStock = product.oilStockMl <= product.lowStockThresholdMl;

  const activeVariants = useMemo(
    () => product.variants.filter((v) => v.isActive),
    [product.variants],
  );

  const types = useMemo(
    () => [...new Set(activeVariants.map((v) => v.type))],
    [activeVariants],
  );

  const [selectedType, setSelectedType] = useState<VariantType>(types[0]);

  const sizesForType = useMemo(
    () =>
      activeVariants
        .filter((v) => v.type === selectedType)
        .sort((a, b) => a.sizeMl - b.sizeMl),
    [activeVariants, selectedType],
  );

  const [selectedSizeMl, setSelectedSizeMl] = useState<number>(
    sizesForType[0]?.sizeMl,
  );

  const selectedVariant =
    activeVariants.find(
      (v) => v.type === selectedType && v.sizeMl === selectedSizeMl,
    ) ?? sizesForType[0];

  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [giftDialogOpen, setGiftDialogOpen] = useState(false);

  const maxQty = maxAdditionalUnits(
    remainingMl,
    selectedVariant?.oilMlPerUnit ?? 0,
  );

  useEffect(() => {
    setQty(1);
  }, [selectedVariant?.variantId]);

  useEffect(() => {
    setQty((q) => Math.min(q, Math.max(1, maxQty)));
  }, [maxQty]);

  function handleTypeChange(type: VariantType) {
    setSelectedType(type);
    const sizes = activeVariants
      .filter((v) => v.type === type)
      .sort((a, b) => a.sizeMl - b.sizeMl);
    setSelectedSizeMl(sizes[0]?.sizeMl);
  }

  const siteUrl = useSiteUrl();
  const { whatsappNumber } = useSiteSettings();

  if (!selectedVariant) return null;

  const outOfStock = maxQty <= 0;

  const whatsappUrl = buildWhatsAppUrl(
    buildProductOrderMessage({
      productName: product.name,
      variantLabel: formatVariantLabel(selectedVariant.type, selectedVariant.sizeMl),
      qty,
      unitPrice: selectedVariant.priceInr,
      productUrl: `${siteUrl}/product/${product.slug}`,
    }),
    whatsappNumber,
  );

  function cartItemBase() {
    return {
      productId: product.id,
      variantId: selectedVariant.variantId,
      productName: product.name,
      slug: product.slug,
      variantLabel: formatVariantLabel(
        selectedVariant.type,
        selectedVariant.sizeMl,
      ),
      type: selectedVariant.type,
      sizeMl: selectedVariant.sizeMl,
      unitPrice: selectedVariant.priceInr,
      oilMlPerUnit: selectedVariant.oilMlPerUnit,
    };
  }

  function handleAddToCart() {
    if (!selectedVariant || outOfStock) return;
    addItem(cartItemBase(), qty);
    setJustAdded(true);
    open();
    setTimeout(() => setJustAdded(false), 1500);
  }

  function handleGiftConfirm(details: GiftDetails) {
    if (!selectedVariant || outOfStock) return;
    addItem(cartItemBase(), qty, details);
    setGiftDialogOpen(false);
    open();
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Step 1: type */}
      <div>
        <p className="mb-3 text-xs uppercase tracking-[0.3em] text-kiswa-ink-muted">
          Choose your ritual
        </p>
        <div className="grid grid-cols-2 gap-4">
          {types.map((type) => {
            const meta = TYPE_META[type];
            const Icon = meta.icon;
            const active = selectedType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => handleTypeChange(type)}
                className={`relative cursor-pointer rounded-lg border p-5 text-left transition-colors ${
                  active
                    ? "border-kiswa-gold bg-kiswa-surface-2"
                    : "border-kiswa-border bg-kiswa-surface hover:border-kiswa-gold/40"
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="variant-type-highlight"
                    className="absolute inset-0 rounded-lg ring-1 ring-kiswa-gold"
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  />
                )}
                <Icon
                  size={22}
                  className={active ? "text-kiswa-gold" : "text-kiswa-ink-muted"}
                />
                <p
                  className={`mt-3 font-display text-lg ${active ? "text-kiswa-gold" : "text-kiswa-ink"}`}
                >
                  {meta.label}
                </p>
                <p className="mt-1 text-xs text-kiswa-ink-muted">
                  {meta.caption}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: size */}
      {sizesForType.length > 1 && (
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.3em] text-kiswa-ink-muted">
            Size
          </p>
          <div className="flex flex-wrap gap-3">
            {sizesForType.map((v) => {
              const active = v.sizeMl === selectedSizeMl;
              return (
                <button
                  key={v.variantId}
                  type="button"
                  onClick={() => setSelectedSizeMl(v.sizeMl)}
                  className={`cursor-pointer rounded-full border px-5 py-2 text-sm tracking-wide transition-colors ${
                    active
                      ? "border-kiswa-gold bg-kiswa-gold text-kiswa-void"
                      : "border-kiswa-border text-kiswa-ink-muted hover:border-kiswa-gold/50 hover:text-kiswa-gold"
                  }`}
                >
                  {v.sizeMl}ml
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Price + stock */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedVariant.variantId}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col gap-1"
        >
          <div className="flex items-baseline gap-3">
            <span className="font-display text-3xl text-kiswa-ink">
              {formatInr(selectedVariant.priceInr)}
            </span>
            {selectedVariant.mrpInr > selectedVariant.priceInr && (
              <span className="text-sm text-kiswa-ink-muted line-through">
                {formatInr(selectedVariant.mrpInr)}
              </span>
            )}
          </div>
          {outOfStock ? (
            <span className="text-sm text-red-400">Out of stock</span>
          ) : lowStock ? (
            <span className="text-sm text-kiswa-gold-soft">Low stock</span>
          ) : (
            <span className="text-sm text-kiswa-ink-muted">In stock</span>
          )}
        </motion.div>
      </AnimatePresence>

      {giftMode && (
        <p className="-mb-4 flex items-center gap-1.5 text-sm text-kiswa-gold-soft">
          <Gift size={15} />
          Shopping for a gift
        </p>
      )}

      {/* Quantity + add to cart. Gift mode stacks vertically on mobile (the
       * qty stepper, the full-width "Add as Gift" pill, and the "or add
       * without gift wrapping" link all need their own row — squeezing all
       * three into one flex row at narrow widths is what caused the button
       * to collapse into an overflowing circle) and only becomes a row from
       * sm: up; the plain "Add to Bag" row never had that problem (its
       * secondary button already falls back to icon-only on mobile) so it
       * keeps the simpler always-row layout. */}
      <div
        className={
          giftMode
            ? "flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4"
            : "flex items-center gap-4"
        }
      >
        <div
          className={`flex items-center rounded-full border border-kiswa-border ${giftMode ? "self-start sm:self-auto" : ""}`}
        >
          <button
            type="button"
            aria-label="Decrease quantity"
            disabled={outOfStock}
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="cursor-pointer p-3 text-kiswa-ink-muted hover:text-kiswa-gold disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Minus size={14} />
          </button>
          <span className="min-w-[2rem] text-center text-sm text-kiswa-ink">
            {qty}
          </span>
          <button
            type="button"
            aria-label="Increase quantity"
            disabled={outOfStock || qty >= maxQty}
            onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
            className="cursor-pointer p-3 text-kiswa-ink-muted hover:text-kiswa-gold disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={14} />
          </button>
        </div>

        {giftMode ? (
          <motion.button
            type="button"
            disabled={outOfStock}
            onClick={() => setGiftDialogOpen(true)}
            whileTap={{ scale: 0.97 }}
            className="flex w-full cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full bg-kiswa-gold py-3 text-sm font-medium tracking-wide text-kiswa-void transition-colors hover:bg-kiswa-gold-soft disabled:cursor-not-allowed disabled:bg-kiswa-border disabled:text-kiswa-ink-muted sm:flex-1"
          >
            <Gift size={16} />
            {outOfStock ? "Out of Stock" : "Add as Gift"}
          </motion.button>
        ) : (
          <>
            <motion.button
              type="button"
              disabled={outOfStock}
              onClick={handleAddToCart}
              whileTap={{ scale: 0.97 }}
              className="flex-1 cursor-pointer rounded-full bg-kiswa-gold py-3 text-sm font-medium tracking-wide text-kiswa-void transition-colors hover:bg-kiswa-gold-soft disabled:cursor-not-allowed disabled:bg-kiswa-border disabled:text-kiswa-ink-muted"
            >
              {outOfStock ? "Out of Stock" : justAdded ? "Added ✓" : "Add to Bag"}
            </motion.button>
            <button
              type="button"
              disabled={outOfStock}
              aria-label="Send as a gift"
              onClick={() => setGiftDialogOpen(true)}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-kiswa-border px-4 py-3 text-sm text-kiswa-ink-muted transition-colors hover:border-kiswa-gold/50 hover:text-kiswa-gold disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Gift size={16} />
              <span className="hidden sm:inline">Send as Gift</span>
            </button>
          </>
        )}
      </div>

      {giftMode && (
        <button
          type="button"
          disabled={outOfStock}
          onClick={handleAddToCart}
          className="-mt-2 cursor-pointer py-2 text-center text-xs text-kiswa-ink-muted underline underline-offset-2 hover:text-kiswa-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          {justAdded ? "Added ✓" : "or add without gift wrapping"}
        </button>
      )}

      {/* WhatsApp order — a full-width fallback below Add to Bag / Buy Now,
       * always reflecting the currently selected variant + quantity. Extra
       * bottom padding on mobile keeps it clear of the fixed floating
       * WhatsApp button, which otherwise sits right on top of it. */}
      <div className="-mt-4 flex flex-col gap-1.5 pb-20 sm:pb-0">
        <a
          href={outOfStock ? undefined : whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={outOfStock}
          onClick={(e) => {
            if (outOfStock) e.preventDefault();
          }}
          className={`flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-medium tracking-wide transition-colors ${
            outOfStock
              ? "cursor-not-allowed bg-kiswa-border text-kiswa-ink-muted"
              : "cursor-pointer bg-[#25D366] text-white hover:bg-[#20bd5a]"
          }`}
        >
          <WhatsAppIcon size={18} />
          Order on WhatsApp
        </a>
        <p className="text-center text-xs text-kiswa-ink-muted">
          We&apos;ll confirm your order and payment on WhatsApp.
        </p>
      </div>

      <GiftDialog
        open={giftDialogOpen}
        onClose={() => setGiftDialogOpen(false)}
        onConfirm={handleGiftConfirm}
        itemLabel={`${product.name} — ${formatVariantLabel(selectedVariant.type, selectedVariant.sizeMl)}`}
      />
    </div>
  );
}

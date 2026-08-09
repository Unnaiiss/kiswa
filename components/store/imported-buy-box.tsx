"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Gift, Minus, Plus } from "lucide-react";
import type { GiftDetails } from "@/lib/cart/types";
import type { StoreProduct } from "@/lib/store/queries";
import { formatInr } from "@/lib/pricing";
import { IMPORTED_VARIANT_ID } from "@/lib/products";
import {
  WHATSAPP_REASSURANCE_LINE,
  buildProductOrderMessage,
  buildWhatsAppUrl,
  useSiteUrl,
} from "@/lib/whatsapp";
import { useSiteSettings } from "@/lib/store/site-settings-context";
import { ONLINE_PAYMENTS_ENABLED } from "@/lib/config/featureFlags";
import { useCart } from "./cart-provider";
import { GiftDialog } from "./gift-dialog";
import { WhatsAppIcon } from "./whatsapp-icon";

/** Product-page buy box for an imported perfume — one price, one size, so
 * unlike VariantSelector there's no oil/spray toggle or size picker, just a
 * quantity stepper and the Add to Bag / Send as Gift / WhatsApp actions. */
export function ImportedBuyBox({
  product,
  giftMode = false,
}: {
  product: StoreProduct & { productType: "imported" };
  giftMode?: boolean;
}) {
  const { items, addItem, open } = useCart();

  // Units already committed to other lines of this product in the cart
  // reduce what's left to add right now (same product can't have more than
  // one non-gift line, but gift lines are separate).
  const unitsCommittedInCart = useMemo(
    () =>
      items
        .filter((line) => line.productId === product.id)
        .reduce((sum, line) => sum + line.qty, 0),
    [items, product.id],
  );
  const remainingUnits = product.unitStock - unitsCommittedInCart;
  const lowStock = product.unitStock <= product.lowStockThresholdUnits;
  const maxQty = Math.max(0, remainingUnits);
  const outOfStock = maxQty <= 0;

  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [giftDialogOpen, setGiftDialogOpen] = useState(false);

  useEffect(() => {
    setQty((q) => Math.min(q, Math.max(1, maxQty)));
  }, [maxQty]);

  const siteUrl = useSiteUrl();
  const { whatsappNumber } = useSiteSettings();

  const whatsappUrl = buildWhatsAppUrl(
    buildProductOrderMessage({
      productName: product.name,
      variantLabel: product.sizeLabel,
      qty,
      unitPrice: product.priceInr,
      productUrl: `${siteUrl}/product/${product.slug}`,
    }),
    whatsappNumber,
  );

  function cartItemBase() {
    return {
      productId: product.id,
      variantId: IMPORTED_VARIANT_ID,
      productName: product.name,
      slug: product.slug,
      variantLabel: product.sizeLabel,
      type: "oil" as const,
      sizeMl: 0,
      unitPrice: product.priceInr,
      oilMlPerUnit: 0,
    };
  }

  function handleAddToCart() {
    if (outOfStock) return;
    addItem(cartItemBase(), qty);
    setJustAdded(true);
    open();
    setTimeout(() => setJustAdded(false), 1500);
  }

  function handleGiftConfirm(details: GiftDetails) {
    if (outOfStock) return;
    addItem(cartItemBase(), qty, details);
    setGiftDialogOpen(false);
    open();
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        {product.brand && (
          <p className="mb-1 text-xs uppercase tracking-[0.3em] text-kiswa-gold-soft">
            {product.brand}
          </p>
        )}
        <p className="text-sm text-kiswa-ink-muted">{product.sizeLabel}</p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key="imported-price"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col gap-1"
        >
          <div className="flex items-baseline gap-3">
            <span className="font-display text-3xl text-kiswa-ink">
              {formatInr(product.priceInr)}
            </span>
            {product.mrpInr > product.priceInr && (
              <span className="text-sm text-kiswa-ink-muted line-through">
                {formatInr(product.mrpInr)}
              </span>
            )}
          </div>
          {outOfStock ? (
            <span className="text-sm text-red-400">Out of stock</span>
          ) : lowStock ? (
            <span className="text-sm text-kiswa-gold-soft">Only {product.unitStock} left</span>
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
          <span className="min-w-[2rem] text-center text-sm text-kiswa-ink">{qty}</span>
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

      {/* WhatsApp order. Extra bottom padding on mobile keeps it clear of
       * the fixed floating WhatsApp button, which otherwise sits right on
       * top of it. */}
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
          {ONLINE_PAYMENTS_ENABLED
            ? "We'll confirm your order and payment on WhatsApp."
            : WHATSAPP_REASSURANCE_LINE}
        </p>
      </div>

      <GiftDialog
        open={giftDialogOpen}
        onClose={() => setGiftDialogOpen(false)}
        onConfirm={handleGiftConfirm}
        itemLabel={`${product.name} — ${product.sizeLabel}`}
      />
    </div>
  );
}

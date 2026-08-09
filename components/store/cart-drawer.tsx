"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Gift, Minus, Package, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useCart } from "./cart-provider";
import { GiftDialog } from "./gift-dialog";
import { WhatsAppIcon } from "./whatsapp-icon";
import { formatInr } from "@/lib/pricing";
import { WHATSAPP_REASSURANCE_LINE, buildCartOrderMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { useSiteSettings } from "@/lib/store/site-settings-context";
import { ONLINE_PAYMENTS_ENABLED } from "@/lib/config/featureFlags";
import type { CartItem } from "@/lib/cart/types";

export function CartDrawer() {
  const {
    items,
    isOpen,
    close,
    subtotal,
    updateQty,
    removeItem,
    updateGiftDetails,
    clearGiftStatus,
  } = useCart();
  const [editingLine, setEditingLine] = useState<CartItem | null>(null);
  const { whatsappNumber } = useSiteSettings();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={close}
          />
          <motion.aside
            key="panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-kiswa-border bg-kiswa-surface text-kiswa-ink"
            role="dialog"
            aria-label="Shopping bag"
          >
            <div className="flex items-center justify-between border-b border-kiswa-border px-6 py-5">
              <h2 className="font-display text-xl tracking-wide">
                Your Bag
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label="Close bag"
                className="cursor-pointer rounded-full p-2 text-kiswa-ink-muted transition-colors hover:bg-kiswa-surface-2 hover:text-kiswa-gold"
              >
                <X size={20} />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
                <ShoppingBag className="text-kiswa-ink-muted" size={40} />
                <p className="text-kiswa-ink-muted">Your bag is empty.</p>
                <Link
                  href="/shop"
                  onClick={close}
                  className="cursor-pointer text-sm font-medium tracking-wide text-kiswa-gold underline underline-offset-4 hover:text-kiswa-gold-soft"
                >
                  Explore the collection
                </Link>
              </div>
            ) : (
              <>
                <ul className="flex-1 overflow-y-auto px-6 py-4">
                  {items.map((line) => (
                    <li
                      key={line.lineId}
                      className="flex gap-4 border-b border-kiswa-border/60 py-4 last:border-none"
                    >
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-kiswa-border bg-kiswa-surface-2">
                        <div className="h-8 w-3 rounded-full bg-gradient-to-b from-kiswa-gold-soft to-kiswa-gold-dim" />
                      </div>
                      <div className="flex flex-1 flex-col gap-1">
                        <p className="text-sm leading-snug text-kiswa-ink">
                          {line.combo ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Package size={12} className="text-kiswa-gold" />
                              {line.productName}
                            </span>
                          ) : (
                            <>
                              {line.productName}{" "}
                              <span className="text-kiswa-ink-muted">
                                — {line.variantLabel}
                              </span>
                            </>
                          )}
                        </p>
                        {line.combo ? (
                          <ul className="text-xs text-kiswa-ink-muted">
                            {line.combo.components.map((c, idx) => (
                              <li key={`${c.productId}-${c.variantId}-${idx}`}>
                                {c.productName} — {c.variantLabel}
                                {c.qty > 1 ? ` ×${c.qty}` : ""}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-kiswa-ink-muted">
                            {formatInr(line.unitPrice)} each
                          </p>
                        )}

                        {line.gift && (
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-kiswa-gold/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-kiswa-gold uppercase">
                              <Gift size={10} />
                              Gift for {line.gift.recipientName}
                            </span>
                            <button
                              type="button"
                              onClick={() => setEditingLine(line)}
                              className="cursor-pointer text-[11px] text-kiswa-ink-muted underline underline-offset-2 hover:text-kiswa-gold"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => clearGiftStatus(line.lineId)}
                              className="cursor-pointer text-[11px] text-kiswa-ink-muted underline underline-offset-2 hover:text-red-400"
                            >
                              Remove gift
                            </button>
                          </div>
                        )}

                        <div className="mt-1 flex items-center gap-3">
                          <div className="flex items-center rounded-full border border-kiswa-border">
                            <button
                              type="button"
                              aria-label="Decrease quantity"
                              onClick={() => updateQty(line.lineId, line.qty - 1)}
                              className="cursor-pointer p-1.5 text-kiswa-ink-muted hover:text-kiswa-gold"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="min-w-[1.5rem] text-center text-xs">
                              {line.qty}
                            </span>
                            <button
                              type="button"
                              aria-label="Increase quantity"
                              onClick={() => updateQty(line.lineId, line.qty + 1)}
                              className="cursor-pointer p-1.5 text-kiswa-ink-muted hover:text-kiswa-gold"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          <button
                            type="button"
                            aria-label="Remove item"
                            onClick={() => removeItem(line.lineId)}
                            className="cursor-pointer text-kiswa-ink-muted hover:text-red-400"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-kiswa-ink">
                        {formatInr(line.unitPrice * line.qty)}
                      </p>
                    </li>
                  ))}
                </ul>

                <div className="border-t border-kiswa-border px-6 py-5">
                  <div className="mb-4 flex items-center justify-between text-sm">
                    <span className="text-kiswa-ink-muted">Subtotal</span>
                    <span className="font-display text-lg text-kiswa-ink">
                      {formatInr(subtotal)}
                    </span>
                  </div>
                  {ONLINE_PAYMENTS_ENABLED ? (
                    <>
                      <Link
                        href="/checkout"
                        onClick={close}
                        className="block w-full cursor-pointer rounded-full bg-kiswa-gold py-3 text-center text-sm font-medium tracking-wide text-kiswa-void transition-colors hover:bg-kiswa-gold-soft"
                      >
                        Checkout
                      </Link>
                      <a
                        href={buildWhatsAppUrl(buildCartOrderMessage(items, subtotal), whatsappNumber)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 flex w-full cursor-pointer items-center justify-center gap-1.5 text-xs text-kiswa-ink-muted underline underline-offset-2 hover:text-[#25D366]"
                      >
                        <WhatsAppIcon size={14} />
                        Order this cart on WhatsApp
                      </a>
                    </>
                  ) : (
                    <>
                      <a
                        href={buildWhatsAppUrl(buildCartOrderMessage(items, subtotal), whatsappNumber)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={close}
                        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#25D366] py-3 text-center text-sm font-medium tracking-wide text-white transition-colors hover:bg-[#20bd5a]"
                      >
                        <WhatsAppIcon size={16} />
                        Order on WhatsApp
                      </a>
                      <p className="mt-2 text-center text-xs text-kiswa-ink-muted">
                        {WHATSAPP_REASSURANCE_LINE}
                      </p>
                    </>
                  )}
                </div>
              </>
            )}
          </motion.aside>

          <GiftDialog
            open={editingLine !== null}
            onClose={() => setEditingLine(null)}
            itemLabel={
              editingLine
                ? `${editingLine.productName} — ${editingLine.variantLabel}`
                : ""
            }
            initial={editingLine?.gift}
            confirmLabel="Save changes"
            onConfirm={(details) => {
              if (editingLine) updateGiftDetails(editingLine.lineId, details);
              setEditingLine(null);
            }}
          />
        </>
      )}
    </AnimatePresence>
  );
}

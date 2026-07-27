"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useCart } from "./cart-provider";
import { formatInr } from "@/lib/pricing";

export function CartDrawer() {
  const { items, isOpen, close, subtotal, updateQty, removeItem } = useCart();

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
                      key={`${line.productId}-${line.variantId}`}
                      className="flex gap-4 border-b border-kiswa-border/60 py-4 last:border-none"
                    >
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-kiswa-border bg-kiswa-surface-2">
                        <div className="h-8 w-3 rounded-full bg-gradient-to-b from-kiswa-gold-soft to-kiswa-gold-dim" />
                      </div>
                      <div className="flex flex-1 flex-col gap-1">
                        <p className="text-sm leading-snug text-kiswa-ink">
                          {line.productName}{" "}
                          <span className="text-kiswa-ink-muted">
                            — {line.variantLabel}
                          </span>
                        </p>
                        <p className="text-xs text-kiswa-ink-muted">
                          {formatInr(line.unitPrice)} each
                        </p>
                        <div className="mt-1 flex items-center gap-3">
                          <div className="flex items-center rounded-full border border-kiswa-border">
                            <button
                              type="button"
                              aria-label="Decrease quantity"
                              onClick={() =>
                                updateQty(
                                  line.productId,
                                  line.variantId,
                                  line.qty - 1,
                                )
                              }
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
                              onClick={() =>
                                updateQty(
                                  line.productId,
                                  line.variantId,
                                  line.qty + 1,
                                )
                              }
                              className="cursor-pointer p-1.5 text-kiswa-ink-muted hover:text-kiswa-gold"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          <button
                            type="button"
                            aria-label="Remove item"
                            onClick={() =>
                              removeItem(line.productId, line.variantId)
                            }
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
                  <Link
                    href="/checkout"
                    onClick={close}
                    className="block w-full cursor-pointer rounded-full bg-kiswa-gold py-3 text-center text-sm font-medium tracking-wide text-kiswa-void transition-colors hover:bg-kiswa-gold-soft"
                  >
                    Checkout
                  </Link>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

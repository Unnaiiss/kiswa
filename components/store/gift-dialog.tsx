"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Gift, X } from "lucide-react";
import type { GiftDetails } from "@/lib/cart/types";

const MESSAGE_MAX = 200;

interface GiftDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (details: GiftDetails) => void;
  itemLabel: string;
  initial?: GiftDetails;
  confirmLabel?: string;
}

const EMPTY: GiftDetails = {
  recipientName: "",
  message: "",
  senderName: "",
  giftWrap: true,
};

const inputClass =
  "w-full rounded-md border border-kiswa-border bg-kiswa-surface-2 px-4 py-2.5 text-sm text-kiswa-ink placeholder:text-kiswa-ink-muted/50 outline-none transition-colors focus:border-kiswa-gold";

export function GiftDialog({
  open,
  onClose,
  onConfirm,
  itemLabel,
  initial,
  confirmLabel = "Add as Gift",
}: GiftDialogProps) {
  const [details, setDetails] = useState<GiftDetails>(initial ?? EMPTY);

  useEffect(() => {
    if (open) setDetails(initial ?? EMPTY);
  }, [open, initial]);

  function set<K extends keyof GiftDetails>(key: K, value: GiftDetails[K]) {
    setDetails((d) => ({ ...d, [key]: value }));
  }

  const canConfirm = details.recipientName.trim().length > 0;

  function handleConfirm() {
    if (!canConfirm) return;
    onConfirm({
      recipientName: details.recipientName.trim(),
      message: details.message.trim(),
      senderName: details.senderName.trim(),
      giftWrap: details.giftWrap,
    });
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-4 top-1/2 z-[60] mx-auto max-w-md -translate-y-1/2 rounded-lg border border-kiswa-border bg-kiswa-surface text-kiswa-ink sm:inset-x-0"
            role="dialog"
            aria-label="Send as a gift"
          >
            <div className="flex items-start justify-between gap-3 border-b border-kiswa-border px-6 py-5">
              <div className="flex items-center gap-2.5">
                <Gift className="text-kiswa-gold" size={20} />
                <div>
                  <h2 className="font-display text-lg tracking-wide">
                    Send as a Gift
                  </h2>
                  <p className="text-xs text-kiswa-ink-muted">{itemLabel}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="cursor-pointer rounded-full p-1.5 text-kiswa-ink-muted transition-colors hover:bg-kiswa-surface-2 hover:text-kiswa-gold"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto px-6 py-5">
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wide text-kiswa-ink-muted">
                  Recipient name
                </label>
                <input
                  className={inputClass}
                  value={details.recipientName}
                  onChange={(e) => set("recipientName", e.target.value)}
                  placeholder="Who is this for?"
                  autoFocus
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs uppercase tracking-wide text-kiswa-ink-muted">
                    Gift message{" "}
                    <span className="text-kiswa-ink-muted/60">(optional)</span>
                  </label>
                  <span className="text-xs text-kiswa-ink-muted">
                    {details.message.length}/{MESSAGE_MAX}
                  </span>
                </div>
                <textarea
                  className={`${inputClass} resize-none`}
                  rows={3}
                  maxLength={MESSAGE_MAX}
                  value={details.message}
                  onChange={(e) => set("message", e.target.value.slice(0, MESSAGE_MAX))}
                  placeholder="Write a personal note to include with the gift"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wide text-kiswa-ink-muted">
                  Your name{" "}
                  <span className="text-kiswa-ink-muted/60">(optional)</span>
                </label>
                <input
                  className={inputClass}
                  value={details.senderName}
                  onChange={(e) => set("senderName", e.target.value)}
                  placeholder="From…"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-kiswa-ink">
                <input
                  type="checkbox"
                  checked={details.giftWrap}
                  onChange={(e) => set("giftWrap", e.target.checked)}
                  className="size-4 rounded border-kiswa-border bg-kiswa-surface-2 accent-kiswa-gold"
                />
                Wrap this beautifully, free of charge
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-kiswa-border px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-full px-4 py-2 text-sm text-kiswa-ink-muted transition-colors hover:text-kiswa-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!canConfirm}
                onClick={handleConfirm}
                className="cursor-pointer rounded-full bg-kiswa-gold px-5 py-2.5 text-sm font-medium tracking-wide text-kiswa-void transition-colors hover:bg-kiswa-gold-soft disabled:cursor-not-allowed disabled:opacity-50"
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { LogIn, UserPlus, X } from "lucide-react";
import { RESUME_CART_KEY } from "./cart-provider";

function currentPathWithQuery(): string {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}`;
}

/** Set right before navigating to sign in/sign up, so the cart drawer
 * reopens automatically once the customer lands back — see
 * cart-provider.tsx's own RESUME_CART_KEY effect. Only relevant when this
 * prompt was triggered from an actual cart interaction (the drawer or a
 * product page's order button); harmless no-op otherwise. */
function markResumeCart() {
  try {
    window.sessionStorage.setItem(RESUME_CART_KEY, "1");
  } catch {
    // ignore
  }
}

/**
 * The "you need an account to order" gate — shown in place of the real
 * WhatsApp/Checkout action when lib/config/featureFlags.ts's
 * REQUIRE_LOGIN_TO_ORDER is on and the visitor isn't signed in (see
 * lib/store/useOrderGate.ts). Sign in / Create account both carry a
 * same-origin `redirect` back to exactly the page this was opened from
 * (sanitizeRedirect validates it server-side too), so the cart — already
 * intact in localStorage regardless — is right where they left it, and the
 * drawer reopens itself via RESUME_CART_KEY.
 */
export function SignInToOrderPrompt({ open, onClose }: { open: boolean; onClose: () => void }) {
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
            className="fixed inset-0 z-[70] bg-black/70"
            onClick={onClose}
          />
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-4 top-1/2 z-[70] mx-auto max-w-sm -translate-y-1/2 rounded-2xl border border-kiswa-border bg-kiswa-surface p-6 text-center sm:inset-x-0"
            role="dialog"
            aria-label="Sign in to place your order"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute top-4 right-4 cursor-pointer rounded-full p-1.5 text-kiswa-ink-muted hover:bg-kiswa-surface-2 hover:text-kiswa-gold"
            >
              <X size={18} />
            </button>

            <p className="mt-2 font-display text-xl text-kiswa-ink">Sign in to order</p>
            <p className="mt-3 text-sm text-kiswa-ink-muted">
              Sign in to place your order — it takes a few seconds and lets you track your
              delivery.
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <Link
                href={`/account/login?redirect=${encodeURIComponent(currentPathWithQuery())}`}
                onClick={markResumeCart}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-full bg-kiswa-gold py-3 text-sm font-medium tracking-wide text-kiswa-void transition-colors hover:bg-kiswa-gold-soft"
              >
                <LogIn size={16} />
                Sign in
              </Link>
              <Link
                href={`/account/signup?redirect=${encodeURIComponent(currentPathWithQuery())}`}
                onClick={markResumeCart}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-full border border-kiswa-border py-3 text-sm font-medium tracking-wide text-kiswa-ink transition-colors hover:border-kiswa-gold/50 hover:text-kiswa-gold"
              >
                <UserPlus size={16} />
                Create account
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

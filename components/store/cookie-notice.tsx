"use client";

import { useEffect, useState } from "react";

const DISMISSED_KEY = "kiswa-cookie-notice-dismissed";

/**
 * A lightweight disclosure, not a consent gate — the site now runs the Meta
 * Pixel (see meta-pixel.tsx) in addition to its own first-party cookies, so
 * this exists to say so. Dismissing just hides it for this browser
 * (localStorage flag); it doesn't block or delay any tracking, since
 * nothing here is conditioned on the visitor's response.
 */
export function CookieNotice() {
  const [dismissed, setDismissed] = useState(true); // default hidden until we know localStorage says otherwise, avoiding a flash on every fresh visitor

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISSED_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // ignore — worst case the notice reappears next visit
    }
  }

  if (dismissed) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-kiswa-border bg-kiswa-surface/95 px-6 py-4 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
        <p className="text-sm text-kiswa-ink-muted">
          We use cookies and similar technologies (including the Meta Pixel) to remember your
          cart, understand how the site is used, and show you relevant ads.
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 cursor-pointer rounded-full bg-kiswa-gold px-5 py-2 text-sm font-medium tracking-wide text-kiswa-void transition-colors hover:bg-kiswa-gold-soft"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

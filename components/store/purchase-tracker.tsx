"use client";

import { useEffect } from "react";
import { trackPurchase } from "@/lib/analytics/metaPixel";

const TRACKED_KEY_PREFIX = "kiswa-pixel-purchase-tracked:";

/**
 * Renders on the checkout success page ONLY in the two branches where a
 * real, server-verified sale doc exists (COD, and a completed/verified
 * Razorpay payment) — never for a still-pending, refund-flagged, or
 * otherwise unconfirmed order. `saleId` is the Firestore sale doc id (not
 * client-suppliable — always read server-side from the sale that was
 * actually looked up), used as the de-dupe key so refreshing this page
 * never double-counts the same order.
 */
export function PurchaseTracker({
  saleId,
  total,
  contentIds,
}: {
  saleId: string;
  total: number;
  contentIds: string[];
}) {
  useEffect(() => {
    const key = `${TRACKED_KEY_PREFIX}${saleId}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      // localStorage unavailable (private mode, etc.) — fire once for this
      // mount anyway; safer to occasionally double-count than to silently
      // never count a real order.
    }
    trackPurchase({ contentIds, value: total });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per distinct saleId, not on every render
  }, [saleId]);

  return null;
}

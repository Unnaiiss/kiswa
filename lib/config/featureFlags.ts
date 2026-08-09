/** Single source of truth for whether online (Razorpay) checkout is live.
 * Defaults to false (WhatsApp-only ordering) — every checkout/Razorpay code
 * path stays in the codebase intact behind this flag, so flipping
 * NEXT_PUBLIC_ONLINE_PAYMENTS_ENABLED to "true" restores it with no code
 * changes. Read on both client and server (it's NEXT_PUBLIC_, inlined at
 * build time either way). */
export const ONLINE_PAYMENTS_ENABLED =
  process.env.NEXT_PUBLIC_ONLINE_PAYMENTS_ENABLED === "true";

/** Single source of truth for whether online (Razorpay) checkout is live.
 * Defaults to false (WhatsApp-only ordering) — every checkout/Razorpay code
 * path stays in the codebase intact behind this flag, so flipping
 * NEXT_PUBLIC_ONLINE_PAYMENTS_ENABLED to "true" restores it with no code
 * changes. Read on both client and server (it's NEXT_PUBLIC_, inlined at
 * build time either way). */
export const ONLINE_PAYMENTS_ENABLED =
  process.env.NEXT_PUBLIC_ONLINE_PAYMENTS_ENABLED === "true";

/** Whether placing an order (WhatsApp or Razorpay checkout) requires a
 * signed-in customer account — defaults to TRUE (opposite default from
 * ONLINE_PAYMENTS_ENABLED above), so only an explicit literal "false" turns
 * it off. Purely a front-end gate: browsing, search, product pages, and the
 * cart itself stay fully open to guests regardless of this flag — it only
 * gates the final order-placing actions (see components/store/
 * sign-in-to-order-prompt.tsx and lib/store/useOrderGate.ts), so it can be
 * flipped instantly if it hurts conversion, with no other code changes. */
export const REQUIRE_LOGIN_TO_ORDER =
  process.env.NEXT_PUBLIC_REQUIRE_LOGIN_TO_ORDER !== "false";

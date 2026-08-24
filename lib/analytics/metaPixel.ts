/**
 * Meta (Facebook) Pixel — shared constant, path-scoping rule, and typed
 * event helpers. Storefront only: components/store/meta-pixel.tsx is the
 * one place the pixel script actually mounts (inside app/(store)/layout.tsx
 * — structurally absent from /admin and /pos, which sit outside that route
 * group entirely) and it additionally self-excludes on /account paths,
 * where customer PII (name, address, order history) is on screen. Every
 * track* function below is a no-op if the pixel never loaded (unset ID, or
 * an excluded path), so call sites never need their own "is this enabled"
 * check.
 *
 * Privacy: every event below sends product/order identifiers and INR
 * values only — never a customer's name, email, phone, or address. Do not
 * add a parameter to any of these functions that would violate that.
 */

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || null;

/** Paths where the pixel must never load or fire, even though they sit
 * inside the (store) layout — customer account pages show PII on screen. */
const EXCLUDED_PATH_PREFIXES = ["/account"];

export function isPixelExcludedPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return EXCLUDED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[] };
  }
}

function fbq(...args: unknown[]) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  window.fbq(...args);
}

export function trackPageView() {
  fbq("track", "PageView");
}

export function trackViewContent(params: {
  contentId: string;
  contentName: string;
  value: number;
}) {
  fbq("track", "ViewContent", {
    content_ids: [params.contentId],
    content_name: params.contentName,
    content_type: "product",
    value: params.value,
    currency: "INR",
  });
}

export function trackAddToCart(params: {
  contentId: string;
  contentName: string;
  value: number;
}) {
  fbq("track", "AddToCart", {
    content_ids: [params.contentId],
    content_name: params.contentName,
    content_type: "product",
    value: params.value,
    currency: "INR",
  });
}

export function trackInitiateCheckout(params: {
  contentIds: string[];
  value: number;
  numItems: number;
}) {
  fbq("track", "InitiateCheckout", {
    content_ids: params.contentIds,
    content_type: "product",
    value: params.value,
    currency: "INR",
    num_items: params.numItems,
  });
}

export function trackPurchase(params: { contentIds: string[]; value: number }) {
  fbq("track", "Purchase", {
    content_ids: params.contentIds,
    content_type: "product",
    value: params.value,
    currency: "INR",
  });
}

export function trackSearch(params: { searchString: string }) {
  fbq("track", "Search", { search_string: params.searchString });
}

export function trackContact() {
  fbq("track", "Contact");
}

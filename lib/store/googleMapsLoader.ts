"use client";

// Same lazy-script-injection shape as lib/store/razorpay-checkout.ts's
// loadRazorpayCheckout — one shared pattern for every third-party browser
// script this app loads.

declare global {
  interface Window {
    google?: typeof google;
  }
}

const SCRIPT_ID = "google-maps-places";

/** NEXT_PUBLIC_ (build-time-inlined, same pattern as every other flag in
 * this app) since the Maps JS API can only ever run client-side — there is
 * no server-side use of this key. Unset is a deliberately silent no-op (see
 * useAddressAutocomplete) rather than a thrown error: address autocomplete
 * is a progressive enhancement over the existing plain text inputs, never
 * a requirement to place an order. */
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();

let loadPromise: Promise<boolean> | null = null;

/** Lazily injects the Maps JS API (places library only) exactly once per
 * page, however many forms call this concurrently — resolves false (never
 * throws) if the key is unset or the script fails to load, so every caller
 * can treat "autocomplete unavailable" as a plain, recoverable state. */
export function loadGoogleMapsPlaces(): Promise<boolean> {
  if (loadPromise) return loadPromise;

  if (!API_KEY) {
    loadPromise = Promise.resolve(false);
    return loadPromise;
  }

  if (window.google?.maps?.places) {
    loadPromise = Promise.resolve(true);
    return loadPromise;
  }

  loadPromise = new Promise((resolve) => {
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(API_KEY)}&libraries=places&loading=async`;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
  return loadPromise;
}

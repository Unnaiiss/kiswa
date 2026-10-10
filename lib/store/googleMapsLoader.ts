"use client";

// Same lazy-script-injection shape as lib/store/razorpay-checkout.ts's
// loadRazorpayCheckout — one shared pattern for every third-party browser
// script this app loads.

declare global {
  interface Window {
    google?: typeof google;
    // Google's documented global hook for an AUTH-level failure — invalid
    // key, a key whose "Application restrictions" reject this referrer, an
    // API not enabled on the key, billing not enabled, etc. Critically,
    // none of these cause the <script> tag's own `onerror` to fire — the
    // script file itself downloads and executes fine (HTTP 200), it just
    // detects the problem internally and calls this instead. Without
    // wiring it up, every one of these failure modes looked identical to
    // success from here: `onload` fired, this resolved true, and
    // useAddressAutocomplete's `new google.maps.places.Autocomplete(...)`
    // either silently did nothing or threw inside an unhandled promise
    // rejection — exactly the "wired up, API key set, still doesn't work,
    // no visible error" symptom this was shipped with.
    gm_authFailure?: () => void;
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
    let resolved = false;
    function settle(ok: boolean) {
      if (resolved) return;
      resolved = true;
      resolve(ok);
    }

    // Must be set BEFORE the script tag is added — Google calls this
    // synchronously during its own script execution the moment it detects
    // an auth-level problem, which can happen before this function would
    // otherwise get a chance to attach anything else.
    window.gm_authFailure = () => {
      console.error(
        "[Google Maps] Authentication failed — the API key was rejected. " +
          "Check in Google Cloud Console: (1) the key's 'Application restrictions' " +
          "(HTTP referrers) actually include this exact domain, (2) 'Maps JavaScript API' " +
          "and 'Places API (New)' are both enabled for this project, and (3) billing is " +
          "enabled on the project.",
      );
      settle(false);
    };

    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => settle(true));
      existing.addEventListener("error", () => settle(false));
      return;
    }
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(API_KEY)}&libraries=places&loading=async`;
    script.async = true;
    script.onload = () => settle(true);
    script.onerror = () => {
      console.error("[Google Maps] The script itself failed to load (network error, ad blocker, or CSP).");
      settle(false);
    };
    document.head.appendChild(script);
  });
  return loadPromise;
}

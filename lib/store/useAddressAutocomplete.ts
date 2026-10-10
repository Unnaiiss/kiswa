"use client";

import { useEffect, useRef, useState } from "react";
import { INDIAN_STATES } from "@/lib/store/indian-states";
import { loadGoogleMapsPlaces } from "@/lib/store/googleMapsLoader";

export interface AutocompletedAddress {
  line1: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
}

/** Google's India state names occasionally don't match this app's own
 * INDIAN_STATES list (which uses each state's current official name) —
 * these are the real-world mismatches Google Places actually returns,
 * not a speculative list. Every other state's long_name already matches
 * INDIAN_STATES exactly (case-insensitively). */
const STATE_ALIASES: Record<string, string> = {
  "nct of delhi": "Delhi",
  "orissa": "Odisha",
  "pondicherry": "Puducherry",
  "uttaranchal": "Uttarakhand",
};

function matchIndianState(googleStateName: string): string {
  const normalized = googleStateName.trim().toLowerCase();
  if (!normalized) return "";
  const alias = STATE_ALIASES[normalized];
  if (alias) return alias;
  const exact = INDIAN_STATES.find((s) => s.toLowerCase() === normalized);
  // Falls back to whatever Google returned (trimmed) rather than blanking
  // it out — the <select> this feeds won't have a matching <option>, so it
  // renders as the blank "Select state" placeholder either way, but this
  // keeps the raw value around for the rare case a caller wants it.
  return exact ?? googleStateName.trim();
}

function componentLongName(
  components: google.maps.GeocoderAddressComponent[],
  type: string,
): string {
  return components.find((c) => c.types.includes(type))?.long_name ?? "";
}

function parsePlace(place: google.maps.places.PlaceResult): AutocompletedAddress {
  const components = place.address_components ?? [];
  const streetNumber = componentLongName(components, "street_number");
  const route = componentLongName(components, "route");
  const line1 = `${streetNumber} ${route}`.trim() || place.name?.trim() || "";

  return {
    line1,
    city: componentLongName(components, "locality"),
    district: componentLongName(components, "administrative_area_level_2"),
    state: matchIndianState(componentLongName(components, "administrative_area_level_1")),
    pincode: componentLongName(components, "postal_code"),
  };
}

/**
 * Wires Google Places Autocomplete onto an EXISTING street-address <input>
 * (via `inputRef`) rather than introducing any new field or a map — a
 * visitor keeps typing into the same "Address line 1" box they already see,
 * Google shows its own suggestion dropdown beneath it, and picking one
 * calls `onAddressSelected` with the parsed city/district/state/pincode so
 * the caller can merge them into its own form state in one update (house
 * number/apartment/landmark stay exactly what they were — this never
 * touches line2/landmark, which the customer still fills in by hand).
 *
 * Fails silently (never throws, never blocks typing) when
 * NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is unset or the script fails to load —
 * the input just behaves as a plain text field in that case, same as
 * before this feature existed. `available` reflects that, for callers that
 * want to show a small "powered by Google" hint only once it's live.
 */
export function useAddressAutocomplete(
  inputRef: React.RefObject<HTMLInputElement | null>,
  onAddressSelected: (address: AutocompletedAddress) => void,
) {
  const [available, setAvailable] = useState(false);
  // Keeps the latest callback reachable from the Google listener without
  // re-creating the Autocomplete instance (and its own event listener) on
  // every render — the listener is attached exactly once, on mount.
  const callbackRef = useRef(onAddressSelected);
  callbackRef.current = onAddressSelected;

  useEffect(() => {
    let cancelled = false;
    let autocomplete: google.maps.places.Autocomplete | null = null;

    loadGoogleMapsPlaces().then((loaded) => {
      if (cancelled || !loaded || !inputRef.current) return;

      autocomplete = new window.google!.maps.places.Autocomplete(inputRef.current, {
        fields: ["address_components", "geometry", "name"],
        types: ["address"],
        componentRestrictions: { country: "in" },
      });
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete!.getPlace();
        if (!place.address_components) {
          // The visitor typed free text and pressed Enter without picking a
          // suggestion, or the Place Details lookup failed — leave every
          // field exactly as typed rather than showing an alert() or
          // clearing anything (see this module's own doc comment).
          return;
        }
        callbackRef.current(parsePlace(place));
      });
      setAvailable(true);
    });

    return () => {
      cancelled = true;
      if (autocomplete) window.google?.maps.event.clearInstanceListeners(autocomplete);
    };
    // inputRef is a stable ref object; only run once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { available };
}

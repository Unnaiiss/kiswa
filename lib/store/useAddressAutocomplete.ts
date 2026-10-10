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

export interface AddressSuggestion {
  id: string;
  mainText: string;
  secondaryText: string;
}

/** Google's India state names occasionally don't match this app's own
 * INDIAN_STATES list (which uses each state's current official name) —
 * these are the real-world mismatches Google Places actually returns,
 * not a speculative list. Every other state's long name already matches
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
  return exact ?? googleStateName.trim();
}

function componentLongText(
  components: google.maps.places.AddressComponent[],
  type: string,
): string {
  return components.find((c) => c.types.includes(type))?.longText ?? "";
}

function parsePlace(place: google.maps.places.Place): AutocompletedAddress {
  const components = place.addressComponents ?? [];
  const streetNumber = componentLongText(components, "street_number");
  const route = componentLongText(components, "route");
  const line1 = `${streetNumber} ${route}`.trim() || place.displayName?.trim() || "";

  return {
    line1,
    city: componentLongText(components, "locality"),
    district: componentLongText(components, "administrative_area_level_2"),
    state: matchIndianState(componentLongText(components, "administrative_area_level_1")),
    pincode: componentLongText(components, "postal_code"),
  };
}

const DEBOUNCE_MS = 250;

/**
 * Address suggestions for an EXISTING street-address <input> — the caller
 * still owns and renders that input (and its value/onChange) exactly as
 * before; this hook only watches `inputValue` and returns a suggestion list
 * to render in the caller's own dropdown markup (styled with the app's own
 * Tailwind classes, not Google's).
 *
 * Deliberately NOT built on google.maps.places.Autocomplete (the widget
 * that auto-injects its own <input>-attached dropdown) — as of March 2025
 * that legacy class is unavailable to new Google Cloud customers entirely,
 * which is exactly what a freshly created API key hits. This uses the
 * current, actively-supported replacement instead:
 * AutocompleteSuggestion.fetchAutocompleteSuggestions() for the list, and
 * PlacePrediction.toPlace().fetchFields() for the chosen address's detail —
 * neither is deprecated and both work for a brand-new project.
 *
 * Fails silently (no suggestions, never throws) when
 * NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is unset or the script fails to load —
 * see googleMapsLoader's own doc comment for why, and its console
 * diagnostics for WHY it failed when it does.
 */
export function useAddressAutocomplete(
  inputValue: string,
  onAddressSelected: (address: AutocompletedAddress) => void,
) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const placesRef = useRef<typeof google.maps.places | null>(null);
  // One token per "search session" (first keystroke through the eventual
  // fetchFields call on a selection) — reusing it across every keystroke's
  // suggestion request in that session, then minting a fresh one after a
  // selection, is what gets Google's cheaper session-based billing rather
  // than being charged per individual keystroke request.
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  // Raw PlacePrediction objects, keyed by the same `id` the rendered
  // AddressSuggestion list uses — selection needs the real object (to call
  // .toPlace()), never just the display strings.
  const predictionsRef = useRef<Map<string, google.maps.places.PlacePrediction>>(new Map());

  useEffect(() => {
    let cancelled = false;
    loadGoogleMapsPlaces().then((loaded) => {
      if (cancelled || !loaded) return;
      placesRef.current = window.google!.maps.places;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const query = inputValue.trim();
    if (query.length < 3 || !placesRef.current) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      const places = placesRef.current;
      if (!places) return;
      try {
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new places.AutocompleteSessionToken();
        }
        setLoading(true);
        const { suggestions: results } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: query,
          includedRegionCodes: ["in"],
          sessionToken: sessionTokenRef.current,
        });
        if (cancelled) return;

        predictionsRef.current.clear();
        const next: AddressSuggestion[] = [];
        for (const result of results) {
          const prediction = result.placePrediction;
          if (!prediction) continue;
          predictionsRef.current.set(prediction.placeId, prediction);
          next.push({
            id: prediction.placeId,
            mainText: prediction.mainText?.text ?? prediction.text.text,
            secondaryText: prediction.secondaryText?.text ?? "",
          });
        }
        setSuggestions(next);
      } catch (err) {
        if (!cancelled) {
          console.error("[Google Maps] Failed to fetch address suggestions:", err);
          setSuggestions([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [inputValue]);

  async function selectSuggestion(id: string) {
    const prediction = predictionsRef.current.get(id);
    if (!prediction) return;
    try {
      const place = prediction.toPlace();
      await place.fetchFields({ fields: ["addressComponents", "displayName"] });
      onAddressSelected(parsePlace(place));
    } catch (err) {
      console.error("[Google Maps] Failed to fetch details for the selected address:", err);
    } finally {
      // A completed selection ends this search session — the next keystroke
      // starts a fresh one with its own token, per Google's own guidance.
      sessionTokenRef.current = null;
      setSuggestions([]);
    }
  }

  function clearSuggestions() {
    setSuggestions([]);
  }

  return { suggestions, loading, selectSuggestion, clearSuggestions };
}

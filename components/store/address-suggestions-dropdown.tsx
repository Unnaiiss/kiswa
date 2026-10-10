"use client";

import { useState } from "react";
import type { AddressSuggestion } from "@/lib/store/useAddressAutocomplete";

interface AddressSuggestionsDropdownProps {
  suggestions: AddressSuggestion[];
  loading: boolean;
  onSelect: (id: string) => void;
}

/**
 * Renders directly below a `relative`-positioned wrapper around the
 * existing address line1 <input> (see GuestDetailsForm/AddressForm) — this
 * is this app's OWN markup/styling, not Google's. Google's legacy
 * Autocomplete widget used to render its own `.pac-container` dropdown
 * automatically; the current Places API (AutocompleteSuggestion) returns
 * plain data only, so the caller (useAddressAutocomplete) owns the
 * suggestion list and this component just displays it.
 */
export function AddressSuggestionsDropdown({ suggestions, loading, onSelect }: AddressSuggestionsDropdownProps) {
  const [activeIndex, setActiveIndex] = useState(-1);

  if (!loading && suggestions.length === 0) return null;

  return (
    <div
      className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border border-kiswa-border bg-kiswa-surface shadow-[0_16px_40px_-18px_rgba(0,0,0,0.5)]"
      // Selecting via mousedown (not click) so this fires BEFORE the
      // input's own onBlur closes the dropdown.
      onMouseDown={(e) => e.preventDefault()}
    >
      {loading && suggestions.length === 0 ? (
        <div className="px-3 py-2.5 text-sm text-kiswa-ink-muted">Searching…</div>
      ) : (
        <ul>
          {suggestions.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => onSelect(s.id)}
                className={`block w-full px-3 py-2.5 text-left text-sm transition-colors ${
                  i === activeIndex ? "bg-kiswa-surface-2" : ""
                }`}
              >
                <span className="text-kiswa-ink">{s.mainText}</span>
                {s.secondaryText && <span className="block text-xs text-kiswa-ink-muted">{s.secondaryText}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

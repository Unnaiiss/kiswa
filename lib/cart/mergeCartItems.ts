import type { CartItem } from "./types";
import { makeLineId } from "./lineId";

/**
 * Merges a saved account cart (fetched from the server right after login)
 * into the current local cart — used so a returning customer's cart, saved
 * from a previous session/device, is combined with whatever they've already
 * built as a guest this visit, rather than either side silently replacing
 * the other. Matches lib/cart/cart-provider.tsx's own merge semantics:
 * non-gift, non-combo lines of the same productId+variantId sum their qty;
 * gift and combo lines never merge with anything (each can carry distinct
 * details even for the same product), so they're always appended as their
 * own line with a freshly generated lineId (never reusing the remote line's
 * id, which could collide with a local one).
 */
export function mergeCartItems(local: CartItem[], remote: CartItem[]): CartItem[] {
  const merged = [...local];

  for (const remoteLine of remote) {
    if (remoteLine.gift || remoteLine.combo) {
      merged.push({ ...remoteLine, lineId: makeLineId() });
      continue;
    }
    const idx = merged.findIndex(
      (l) => !l.gift && !l.combo && l.productId === remoteLine.productId && l.variantId === remoteLine.variantId,
    );
    if (idx === -1) {
      merged.push({ ...remoteLine, lineId: makeLineId() });
    } else {
      merged[idx] = { ...merged[idx], qty: merged[idx].qty + remoteLine.qty };
    }
  }

  return merged;
}

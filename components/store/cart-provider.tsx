"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CartItem, ComboCartDetails, GiftDetails } from "@/lib/cart/types";
import { makeLineId } from "@/lib/cart/lineId";
import { mergeCartItems } from "@/lib/cart/mergeCartItems";
import { useCustomerSession } from "@/lib/auth/useCustomerSession";

/** Every cart is now stored under a key scoped to WHO it belongs to — a
 * fixed guest key, or one key per signed-in customer uid — never one
 * global key shared by every visitor of this browser regardless of who's
 * signed in. This is the fix for "cart persists after logout": a logged-
 * out visitor reads/writes GUEST_STORAGE_KEY, which a moment ago (while
 * signed in) held nothing, because the signed-in customer's items lived
 * under their OWN key the whole time and are actively removed from the
 * device on logout (see the identity-change effect below) — there is
 * structurally no shared storage location for the previous customer's
 * cart to "still be in". */
const GUEST_STORAGE_KEY = "kiswa-cart:guest";
function storageKeyFor(identity: string): string {
  return identity === "guest" ? GUEST_STORAGE_KEY : `kiswa-cart:${identity}`;
}
/** The single fixed key this app used before per-identity storage existed —
 * checked (and removed) exactly once, on the very first identity
 * resolution in a tab's lifetime, so an already-in-progress cart from
 * before this change isn't silently orphaned under a key nothing reads
 * anymore. */
const LEGACY_STORAGE_KEY = "kiswa-cart";

/** Which uid's SERVER-saved cart (Firestore customers/{uid}.cart — a
 * returning customer's cart from a previous session/device) has already
 * been fetched and merged in — a durable localStorage flag rather than an
 * in-memory ref, since navigating to the standalone /account/login page
 * (outside the (store) layout) unmounts this entire provider; a ref
 * wouldn't survive the round trip back. Distinct from the guest->account
 * merge below, which is about THIS visit's own guest cart, not a prior
 * session's saved one. */
const SERVER_MERGED_FOR_KEY = "kiswa-cart-server-merged-for";
/** Set by components/store/sign-in-to-order-prompt.tsx right before sending
 * a guest off to sign in/sign up, so the cart drawer reopens automatically
 * once they land back — sessionStorage (not localStorage) since this is
 * only meant to survive that one redirect round trip, not linger. */
export const RESUME_CART_KEY = "kiswa-resume-cart";

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  /** Non-gift, non-combo items merge into an existing line with the same
   * productId+variantId (qty sums); gift items always add a new line, since
   * each can carry its own message/recipient even for the same variant. */
  addItem: (
    item: Omit<CartItem, "qty" | "lineId">,
    qty: number,
    gift?: GiftDetails,
  ) => void;
  /** Combo lines always add a new line (never merge) — two adds of the same
   * combo can carry different choose-any picks, so they must stay distinct
   * cart lines even though they'd share a comboId. */
  addCombo: (combo: ComboCartDetails, unitPrice: number, qty: number) => void;
  updateQty: (lineId: string, qty: number) => void;
  removeItem: (lineId: string) => void;
  updateGiftDetails: (lineId: string, gift: GiftDetails) => void;
  clearGiftStatus: (lineId: string) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function sameNonGiftLine(a: CartItem, productId: string, variantId: string) {
  return !a.gift && !a.combo && a.productId === productId && a.variantId === variantId;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  // null = "we don't yet know who this browser tab belongs to" — the cart
  // storage key isn't chosen, and NOTHING is read from or written to
  // localStorage, until useCustomerSession resolves. Reading (or worse,
  // persisting into) the wrong key even for one render is exactly the bug
  // this identity-scoped design exists to close, so there is deliberately
  // no "assume guest, correct later" fallback here.
  const [identity, setIdentity] = useState<string | null>(null);
  const { customer, loading: customerLoading } = useCustomerSession();
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Resolve identity -> load the RIGHT cart, handling every
  // transition: first load (with a one-time legacy-key migration),
  // guest -> signed-in (merge the guest cart in, then wipe the guest key),
  // and signed-in -> guest OR signed-in -> a DIFFERENT signed-in identity
  // (wipe the previous identity's key off the device — nothing of theirs
  // may remain, whether they explicitly logged out or Firebase's client
  // SDK just replaced them with a different signed-in user). ----
  useEffect(() => {
    if (customerLoading) return;
    const nextIdentity = customer?.uid ?? "guest";
    if (identity === nextIdentity) return;
    const prevIdentity = identity; // null on the very first resolution

    let loaded: CartItem[] = [];
    try {
      const raw = window.localStorage.getItem(storageKeyFor(nextIdentity));
      if (raw) loaded = JSON.parse(raw);
    } catch {
      // ignore corrupt storage
    }

    if (prevIdentity === null) {
      // First-ever resolution in this tab's lifetime — fold in anything
      // left under the old fixed key from before per-identity storage
      // existed, regardless of whether we're resolving to a guest or an
      // already-signed-in returning customer, then retire that key for good.
      try {
        const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacyRaw) {
          const legacyItems: CartItem[] = JSON.parse(legacyRaw);
          if (legacyItems.length > 0) loaded = mergeCartItems(loaded, legacyItems);
        }
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      } catch {
        // ignore
      }
    }

    if (nextIdentity !== "guest") {
      // LOGIN: merge whatever's sitting in the guest key into the account's
      // own cart, then wipe it — it must never resurface for the next
      // person who picks up this device as a guest. Deliberately keyed off
      // `nextIdentity`, not `prevIdentity === "guest"`: the standalone
      // /account/login and /account/signup pages live OUTSIDE the (store)
      // layout, so they unmount this whole provider — the fresh instance
      // that mounts on redirect-back resolves straight from `null` to the
      // signed-in uid, never observing "guest" as its own prevIdentity, even
      // though the browser's guest key may still hold what was just built.
      // In steady state (already signed in, remounting for unrelated
      // reasons) the guest key is normally already empty, making this a
      // harmless no-op.
      try {
        const guestRaw = window.localStorage.getItem(GUEST_STORAGE_KEY);
        if (guestRaw) {
          const guestItems: CartItem[] = JSON.parse(guestRaw);
          if (guestItems.length > 0) loaded = mergeCartItems(loaded, guestItems);
        }
        window.localStorage.removeItem(GUEST_STORAGE_KEY);
      } catch {
        // ignore
      }
    }

    if (prevIdentity && prevIdentity !== "guest" && prevIdentity !== nextIdentity) {
      // LOGOUT (-> guest), or a direct switch to a DIFFERENT account
      // without an explicit logout step in between (Firebase's client SDK
      // simply replaces whoever was signed in) — either way, the PREVIOUS
      // customer's cart must not remain on this device.
      try {
        window.localStorage.removeItem(storageKeyFor(prevIdentity));
      } catch {
        // ignore
      }
    }

    // On the very first resolution ONLY, current React state might hold an
    // item added before identity was known (nothing blocks Add to Bag while
    // useCustomerSession is still resolving) — merge it on top of `loaded`
    // rather than letting this effect silently discard it. This must NOT
    // apply to a real identity transition (login/logout/switch): there,
    // `prev` belongs to the identity we're moving AWAY from, and merging it
    // in would be exactly the cross-identity leak this whole rewrite exists
    // to close (e.g. a signed-in customer's still-in-state items merging
    // into the guest cart the instant they log out).
    if (prevIdentity === null) {
      setItems((prev) => (prev.length === 0 ? loaded : mergeCartItems(loaded, prev)));
    } else {
      setItems(loaded);
    }
    setIdentity(nextIdentity);
  }, [customer?.uid, customerLoading, identity]);

  // ---- Persist the CURRENT identity's cart on every change. Writing is
  // keyed by `identity`, never a shared key, so this can only ever affect
  // the cart of whoever is ACTUALLY signed in (or the guest key, if no
  // one is). ----
  useEffect(() => {
    if (!identity) return;
    try {
      window.localStorage.setItem(storageKeyFor(identity), JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items, identity]);

  // Resume-after-login: reopen the drawer if we set this flag right before
  // sending the customer off to sign in — see
  // components/store/sign-in-to-order-prompt.tsx. Deliberately NOT removed
  // here: the signup/login form's router.push() is immediately followed by
  // a router.refresh(), which can remount this whole provider a second
  // time in dev mode — if the flag were consumed on that first mount, the
  // second mount would find nothing and silently re-close the drawer the
  // customer just saw open. It's removed instead the moment the customer
  // actually dismisses the drawer (see `close` below), which is the real
  // "this resume is done" signal. Unrelated to identity, so this runs once
  // on mount regardless.
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(RESUME_CART_KEY)) {
        setIsOpen(true);
      }
    } catch {
      // ignore
    }
  }, []);

  // Merge the account's SERVER-saved cart (a previous session/a different
  // device) in exactly once per uid (see SERVER_MERGED_FOR_KEY above) —
  // distinct from the guest->account merge above, which only ever concerns
  // THIS visit's own guest cart. Never replaces the local cart, only adds
  // to it (lib/cart/mergeCartItems.ts sums matching lines).
  useEffect(() => {
    if (!identity || identity === "guest" || !customer?.uid) return;
    const uid = customer.uid;
    try {
      if (window.localStorage.getItem(SERVER_MERGED_FOR_KEY) === uid) return;
    } catch {
      return;
    }

    let cancelled = false;
    fetch("/api/account/cart")
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data: { items?: CartItem[] }) => {
        if (cancelled) return;
        try {
          window.localStorage.setItem(SERVER_MERGED_FOR_KEY, uid);
        } catch {
          // ignore
        }
        const remote = data.items ?? [];
        if (remote.length === 0) return;
        setItems((prev) => mergeCartItems(prev, remote));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [identity, customer?.uid]);

  // Keep the account's saved cart in sync (debounced) while signed in, so
  // it's there to merge from next time — a different device, or this one
  // after localStorage is cleared. Best-effort: a failed sync never blocks
  // or surfaces an error, the cart itself is still fully usable locally.
  useEffect(() => {
    if (!identity || identity === "guest") return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      fetch("/api/account/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      }).catch(() => {});
    }, 1000);
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [items, identity]);

  const addItem = useCallback(
    (item: Omit<CartItem, "qty" | "lineId">, qty: number, gift?: GiftDetails) => {
      setItems((prev) => {
        if (gift) {
          return [...prev, { ...item, gift, qty, lineId: makeLineId() }];
        }
        const idx = prev.findIndex((l) =>
          sameNonGiftLine(l, item.productId, item.variantId),
        );
        if (idx === -1) {
          return [...prev, { ...item, qty, lineId: makeLineId() }];
        }
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + qty };
        return next;
      });
      setIsOpen(true);
    },
    [],
  );

  const addCombo = useCallback(
    (combo: ComboCartDetails, unitPrice: number, qty: number) => {
      setItems((prev) => [
        ...prev,
        {
          lineId: makeLineId(),
          productId: combo.comboId,
          variantId: "combo",
          productName: combo.comboTitle,
          slug: "",
          variantLabel: combo.components
            .map((c) => `${c.variantLabel}${c.qty > 1 ? ` ×${c.qty}` : ""}`)
            .join(", "),
          type: "oil",
          sizeMl: 0,
          unitPrice,
          oilMlPerUnit: 0,
          qty,
          combo,
        },
      ]);
      setIsOpen(true);
    },
    [],
  );

  const updateQty = useCallback((lineId: string, qty: number) => {
    setItems((prev) => {
      if (qty <= 0) {
        return prev.filter((l) => l.lineId !== lineId);
      }
      return prev.map((l) => (l.lineId === lineId ? { ...l, qty } : l));
    });
  }, []);

  const removeItem = useCallback((lineId: string) => {
    setItems((prev) => prev.filter((l) => l.lineId !== lineId));
  }, []);

  const updateGiftDetails = useCallback((lineId: string, gift: GiftDetails) => {
    setItems((prev) =>
      prev.map((l) => (l.lineId === lineId ? { ...l, gift } : l)),
    );
  }, []);

  const clearGiftStatus = useCallback((lineId: string) => {
    setItems((prev) =>
      prev.map((l) => {
        if (l.lineId !== lineId) return l;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { gift, ...rest } = l;
        return rest;
      }),
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => {
    setIsOpen(false);
    try {
      window.sessionStorage.removeItem(RESUME_CART_KEY);
    } catch {
      // ignore
    }
  }, []);

  const count = useMemo(() => items.reduce((n, l) => n + l.qty, 0), [items]);
  const subtotal = useMemo(
    () => items.reduce((sum, l) => sum + l.unitPrice * l.qty, 0),
    [items],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count,
      subtotal,
      isOpen,
      addItem,
      addCombo,
      updateQty,
      removeItem,
      updateGiftDetails,
      clearGiftStatus,
      clear,
      open,
      close,
    }),
    [
      items,
      count,
      subtotal,
      isOpen,
      addItem,
      addCombo,
      updateQty,
      removeItem,
      updateGiftDetails,
      clearGiftStatus,
      clear,
      open,
      close,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}

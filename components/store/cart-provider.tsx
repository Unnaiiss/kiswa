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

const STORAGE_KEY = "kiswa-cart";
/** Which account's saved cart has already been merged into this browser's
 * local cart — a durable localStorage flag rather than an in-memory ref,
 * since navigating to the standalone /account/login page (outside the
 * (store) layout) unmounts this entire provider; a ref wouldn't survive the
 * round trip back. Keyed by email (the only stable identifier
 * useCustomerSession exposes) so signing into a DIFFERENT account merges
 * again, but repeated sign-outs/sign-ins as the same account don't
 * re-merge (and re-sum) the same items every time. */
const MERGED_FLAG_KEY = "kiswa-cart-merged-for";
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
  // A STATE flag, not a ref: it must land in the SAME commit as the loaded
  // `items` value below, or the "persist to localStorage" effect a few
  // lines down can fire once with this already true but `items` still at
  // its initial `[]` (a ref mutation is synchronous; a setState call is
  // batched to the next render) — briefly overwriting real cart data in
  // localStorage with "[]" before a second, corrective write catches up.
  // That flicker is invisible on a normal mount, but a remount landing in
  // exactly that window (e.g. the router.refresh() right after the
  // sign-in-to-order redirect) reads localStorage during the bad moment and
  // loses the cart for real. Setting both in the same effect, as state,
  // makes React batch them into one commit — no window to land in.
  const [hasLoaded, setHasLoaded] = useState(false);
  const { customer } = useCustomerSession();
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // ignore corrupt local storage
    } finally {
      setHasLoaded(true);
    }

    // Resume-after-login: reopen the drawer if we set this flag right
    // before sending the customer off to sign in — see
    // components/store/sign-in-to-order-prompt.tsx. Deliberately NOT
    // removed here: the signup/login form's router.push() is immediately
    // followed by a router.refresh(), which can remount this whole provider
    // a second time in dev mode — if the flag were consumed on that first
    // mount, the second mount would find nothing and silently re-close the
    // drawer the customer just saw open. It's removed instead the moment
    // the customer actually dismisses the drawer (see `close` below), which
    // is the real "this resume is done" signal.
    try {
      if (window.sessionStorage.getItem(RESUME_CART_KEY)) {
        setIsOpen(true);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!hasLoaded) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hasLoaded]);

  // Merge the account's saved cart in exactly once per sign-in (see
  // MERGED_FLAG_KEY above for why this happened once EVER for this
  // account+browser, not once per mount) — never replaces the local cart,
  // only adds to it (lib/cart/mergeCartItems.ts sums matching lines).
  useEffect(() => {
    if (!hasLoaded || !customer?.email) return;
    const email = customer.email;
    try {
      if (window.localStorage.getItem(MERGED_FLAG_KEY) === email) return;
    } catch {
      return;
    }

    let cancelled = false;
    fetch("/api/account/cart")
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data: { items?: CartItem[] }) => {
        if (cancelled) return;
        try {
          window.localStorage.setItem(MERGED_FLAG_KEY, email);
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
  }, [customer?.email, hasLoaded]);

  // Keep the account's saved cart in sync (debounced) while signed in, so
  // it's there to merge from next time — a different device, or this one
  // after localStorage is cleared. Best-effort: a failed sync never blocks
  // or surfaces an error, the cart itself is still fully usable locally.
  useEffect(() => {
    if (!hasLoaded || !customer?.email) return;
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
  }, [items, customer?.email, hasLoaded]);

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

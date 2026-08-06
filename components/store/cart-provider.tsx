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

const STORAGE_KEY = "kiswa-cart";

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

function makeLineId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `line-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const hasLoaded = useRef(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // ignore corrupt local storage
    } finally {
      hasLoaded.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

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
  const close = useCallback(() => setIsOpen(false), []);

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

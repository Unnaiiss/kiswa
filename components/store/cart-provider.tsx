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
import type { CartItem } from "@/lib/cart/types";

const STORAGE_KEY = "kiswa-cart";

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  addItem: (item: Omit<CartItem, "qty">, qty: number) => void;
  updateQty: (productId: string, variantId: string, qty: number) => void;
  removeItem: (productId: string, variantId: string) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function sameLine(a: CartItem, productId: string, variantId: string) {
  return a.productId === productId && a.variantId === variantId;
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

  const addItem = useCallback((item: Omit<CartItem, "qty">, qty: number) => {
    setItems((prev) => {
      const idx = prev.findIndex((l) =>
        sameLine(l, item.productId, item.variantId),
      );
      if (idx === -1) return [...prev, { ...item, qty }];
      const next = [...prev];
      next[idx] = { ...next[idx], qty: next[idx].qty + qty };
      return next;
    });
    setIsOpen(true);
  }, []);

  const updateQty = useCallback(
    (productId: string, variantId: string, qty: number) => {
      setItems((prev) => {
        if (qty <= 0) {
          return prev.filter((l) => !sameLine(l, productId, variantId));
        }
        return prev.map((l) =>
          sameLine(l, productId, variantId) ? { ...l, qty } : l,
        );
      });
    },
    [],
  );

  const removeItem = useCallback((productId: string, variantId: string) => {
    setItems((prev) => prev.filter((l) => !sameLine(l, productId, variantId)));
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
      updateQty,
      removeItem,
      clear,
      open,
      close,
    }),
    [items, count, subtotal, isOpen, addItem, updateQty, removeItem, clear, open, close],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}

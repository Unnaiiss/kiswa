"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthReady } from "@/lib/firebase/useAuthReady";
import { productConverter } from "@/lib/firestore/converters";
import type { Product } from "@/lib/firestore/types";

/** Live feed of every product (active and pending) for admin management. */
export function useAllProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const authReady = useAuthReady();

  useEffect(() => {
    if (!authReady) return;
    const ref = collection(db, "products").withConverter(productConverter);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        setProducts(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(`Firestore error (${err.code}): ${err.message}`);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [authReady]);

  return { products, loading, error };
}

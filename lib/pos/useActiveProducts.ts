"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { productConverter } from "@/lib/firestore/converters";
import type { Product } from "@/lib/firestore/types";

/** Live product/stock feed for the billing screen — reflects sales from any
 * POS terminal or the online store the moment they're recorded. */
export function useActiveProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "products").withConverter(productConverter),
      where("isActive", "==", true),
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setProducts(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { products, loading };
}

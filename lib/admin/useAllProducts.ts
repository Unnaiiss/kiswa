"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { productConverter } from "@/lib/firestore/converters";
import type { Product } from "@/lib/firestore/types";

/** Live feed of every product (active and pending) for admin management. */
export function useAllProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ref = collection(db, "products").withConverter(productConverter);
    const unsubscribe = onSnapshot(ref, (snap) => {
      setProducts(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { products, loading };
}

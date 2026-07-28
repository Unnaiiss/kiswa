"use client";

import { useEffect, useState } from "react";
import {
  collection,
  limit as fsLimit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthReady } from "@/lib/firebase/useAuthReady";
import { saleConverter } from "@/lib/firestore/converters";
import type { Sale } from "@/lib/firestore/types";

/**
 * Live feed of sales whose createdAt falls within [from, to]. Only the date
 * range is a server-side query constraint (a single range + orderBy on the
 * same field needs no composite index); channel/paymentMethod/orderStatus
 * filters are applied client-side over this already-bounded result set.
 */
export function useSalesInRange(from: Date, to: Date, limit = 1000) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const authReady = useAuthReady();

  const fromTime = from.getTime();
  const toTime = to.getTime();

  useEffect(() => {
    if (!authReady) return;
    setLoading(true);
    const q = query(
      collection(db, "sales").withConverter(saleConverter),
      where("createdAt", ">=", new Date(fromTime)),
      where("createdAt", "<=", new Date(toTime)),
      orderBy("createdAt", "desc"),
      fsLimit(limit),
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setSales(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsubscribe;
  }, [authReady, fromTime, toTime, limit]);

  return { sales, loading };
}

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
import { paymentAttemptConverter } from "@/lib/firestore/converters";
import type { PaymentAttempt } from "@/lib/firestore/types";

/**
 * Live feed of payment attempts (captured + failed Razorpay attempts, see
 * lib/firestore/types.ts's PaymentAttemptDoc) whose createdAt falls within
 * [from, to] — same single-range-query pattern as useSalesInRange, so it
 * needs no composite index either.
 */
export function usePaymentAttemptsInRange(from: Date, to: Date, limit = 2000) {
  const [attempts, setAttempts] = useState<PaymentAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const authReady = useAuthReady();

  const fromTime = from.getTime();
  const toTime = to.getTime();

  useEffect(() => {
    if (!authReady) return;
    setLoading(true);
    const q = query(
      collection(db, "paymentAttempts").withConverter(paymentAttemptConverter),
      where("createdAt", ">=", new Date(fromTime)),
      where("createdAt", "<=", new Date(toTime)),
      orderBy("createdAt", "desc"),
      fsLimit(limit),
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setAttempts(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsubscribe;
  }, [authReady, fromTime, toTime, limit]);

  return { attempts, loading };
}

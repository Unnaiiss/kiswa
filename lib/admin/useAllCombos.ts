"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthReady } from "@/lib/firebase/useAuthReady";
import { comboConverter } from "@/lib/firestore/converters";
import type { Combo } from "@/lib/firestore/types";

/** Live feed of every combo (active and inactive), ordered for the admin list. */
export function useAllCombos() {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const authReady = useAuthReady();

  useEffect(() => {
    if (!authReady) return;
    const ref = query(
      collection(db, "combos"),
      orderBy("order", "asc"),
    ).withConverter(comboConverter);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        setCombos(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
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

  return { combos, loading, error };
}

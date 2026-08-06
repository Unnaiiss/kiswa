"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { comboConverter } from "@/lib/firestore/converters";
import { isComboCurrentlyValid } from "@/lib/combos";
import type { Combo } from "@/lib/firestore/types";

/** Live feed of active combos for the POS quick-add strip — mirrors
 * useActiveProducts so combo tiles reflect stock/price changes instantly. */
export function useActiveCombos() {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "combos").withConverter(comboConverter),
      where("isActive", "==", true),
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setCombos(
          snap.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .filter((combo) => isComboCurrentlyValid(combo)),
        );
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsubscribe;
  }, []);

  return { combos, loading };
}

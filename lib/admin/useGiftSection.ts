"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthReady } from "@/lib/firebase/useAuthReady";
import { giftSectionConverter } from "@/lib/firestore/converters";
import type { GiftSection } from "@/lib/firestore/types";

/** Live read of the single siteContent/giftSection doc for the admin editor. */
export function useGiftSection() {
  const [giftSection, setGiftSection] = useState<GiftSection | null>(null);
  const [loading, setLoading] = useState(true);
  const authReady = useAuthReady();

  useEffect(() => {
    if (!authReady) return;
    const ref = doc(db, "siteContent", "giftSection").withConverter(
      giftSectionConverter,
    );
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        setGiftSection(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsubscribe;
  }, [authReady]);

  return { giftSection, loading };
}

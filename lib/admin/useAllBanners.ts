"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthReady } from "@/lib/firebase/useAuthReady";
import { bannerConverter } from "@/lib/firestore/converters";
import type { Banner } from "@/lib/firestore/types";

/** Live feed of every banner (active and inactive), ordered for the admin list. */
export function useAllBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const authReady = useAuthReady();

  useEffect(() => {
    if (!authReady) return;
    const ref = query(
      collection(db, "banners"),
      orderBy("order", "asc"),
    ).withConverter(bannerConverter);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        setBanners(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
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

  return { banners, loading, error };
}

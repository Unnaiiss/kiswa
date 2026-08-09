"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthReady } from "@/lib/firebase/useAuthReady";
import { siteSettingsConverter } from "@/lib/firestore/converters";
import type { SiteSettings } from "@/lib/firestore/types";

/** Live read of the single siteContent/siteSettings doc for the admin editor. */
export function useSiteSettings() {
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const authReady = useAuthReady();

  useEffect(() => {
    if (!authReady) return;
    const ref = doc(db, "siteContent", "siteSettings").withConverter(siteSettingsConverter);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        setSiteSettings(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsubscribe;
  }, [authReady]);

  return { siteSettings, loading };
}

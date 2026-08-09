"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthReady } from "@/lib/firebase/useAuthReady";
import { announcementBarConverter } from "@/lib/firestore/converters";
import type { AnnouncementBar } from "@/lib/firestore/types";

/** Live read of the single siteContent/announcementBar doc for the admin editor. */
export function useAnnouncementBar() {
  const [announcementBar, setAnnouncementBar] = useState<AnnouncementBar | null>(null);
  const [loading, setLoading] = useState(true);
  const authReady = useAuthReady();

  useEffect(() => {
    if (!authReady) return;
    const ref = doc(db, "siteContent", "announcementBar").withConverter(
      announcementBarConverter,
    );
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        setAnnouncementBar(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsubscribe;
  }, [authReady]);

  return { announcementBar, loading };
}

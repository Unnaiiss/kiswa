"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthReady } from "@/lib/firebase/useAuthReady";
import { ourStorySectionConverter } from "@/lib/firestore/converters";
import type { OurStorySection } from "@/lib/firestore/types";

/** Live read of the single siteContent/ourStory doc for the admin editor. */
export function useOurStorySection() {
  const [ourStorySection, setOurStorySection] = useState<OurStorySection | null>(null);
  const [loading, setLoading] = useState(true);
  const authReady = useAuthReady();

  useEffect(() => {
    if (!authReady) return;
    const ref = doc(db, "siteContent", "ourStory").withConverter(
      ourStorySectionConverter,
    );
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        setOurStorySection(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsubscribe;
  }, [authReady]);

  return { ourStorySection, loading };
}

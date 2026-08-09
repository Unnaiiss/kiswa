"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthReady } from "@/lib/firebase/useAuthReady";
import { importedSectionConverter } from "@/lib/firestore/converters";
import type { ImportedSection } from "@/lib/firestore/types";

/** Live read of the single siteContent/importedSection doc for the admin editor. */
export function useImportedSection() {
  const [importedSection, setImportedSection] = useState<ImportedSection | null>(null);
  const [loading, setLoading] = useState(true);
  const authReady = useAuthReady();

  useEffect(() => {
    if (!authReady) return;
    const ref = doc(db, "siteContent", "importedSection").withConverter(
      importedSectionConverter,
    );
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        setImportedSection(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsubscribe;
  }, [authReady]);

  return { importedSection, loading };
}

"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthReady } from "@/lib/firebase/useAuthReady";
import { checkoutSettingsConverter } from "@/lib/firestore/converters";
import type { CheckoutSettings } from "@/lib/firestore/types";

/** Live read of the single siteContent/checkoutSettings doc — OFF
 * (codEnabled: false) when the doc doesn't exist yet, since Cash on
 * Delivery defaults off. */
export function useCheckoutSettings() {
  const [settings, setSettings] = useState<CheckoutSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const authReady = useAuthReady();

  useEffect(() => {
    if (!authReady) return;
    const ref = doc(db, "siteContent", "checkoutSettings").withConverter(
      checkoutSettingsConverter,
    );
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        setSettings(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsubscribe;
  }, [authReady]);

  return { codEnabled: settings?.codEnabled ?? false, loading };
}

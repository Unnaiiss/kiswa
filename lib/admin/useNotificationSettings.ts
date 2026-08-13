"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthReady } from "@/lib/firebase/useAuthReady";
import { notificationSettingsConverter } from "@/lib/firestore/converters";
import type { NotificationSettings } from "@/lib/firestore/types";

/** Live read of the single siteContent/notificationSettings doc — OFF
 * (statusChangeWhatsAppEnabled: false) when the doc doesn't exist yet, since
 * this feature defaults off. */
export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const authReady = useAuthReady();

  useEffect(() => {
    if (!authReady) return;
    const ref = doc(db, "siteContent", "notificationSettings").withConverter(
      notificationSettingsConverter,
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

  return { statusChangeWhatsAppEnabled: settings?.statusChangeWhatsAppEnabled ?? false, loading };
}

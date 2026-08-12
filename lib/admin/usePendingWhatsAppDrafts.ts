"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthReady } from "@/lib/firebase/useAuthReady";
import { pendingOrderConverter } from "@/lib/firestore/converters";
import type { PendingOrder } from "@/lib/firestore/types";

/** Live feed of open (status "created"), customer-linked WhatsApp drafts —
 * expired ones (createdAt + 7 days passed) are filtered out client-side
 * rather than via a query constraint, avoiding a third composite-index
 * field for what's expected to be a small collection. See
 * app/api/account/whatsapp-order/route.ts for how these are created and
 * app/api/admin/whatsapp-orders/[id]/convert/route.ts for how they're
 * consumed. */
export function usePendingWhatsAppDrafts() {
  const [drafts, setDrafts] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const authReady = useAuthReady();

  useEffect(() => {
    if (!authReady) return;
    const q = query(
      collection(db, "pendingOrders").withConverter(pendingOrderConverter),
      where("source", "==", "whatsapp"),
      where("status", "==", "created"),
      orderBy("createdAt", "desc"),
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const now = new Date();
        setDrafts(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((d) => !d.expiresAt || d.expiresAt.toDate() > now),
        );
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsubscribe;
  }, [authReady]);

  return { drafts, loading };
}

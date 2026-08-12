"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthReady } from "@/lib/firebase/useAuthReady";
import { customerConverter } from "@/lib/firestore/converters";
import type { Customer } from "@/lib/firestore/types";

/** One-shot (not live — a customer's own profile rarely changes mid-admin-
 * session, unlike sales/stock) fetch of a customer doc for display in admin
 * (linked-customer block on a sale, the customer profile page's own client
 * bits). Requires firestore.rules' customers/{uid} read to allow
 * hasRole('admin') — added alongside this feature, since admin previously
 * had no override there (self-read only). */
export function useCustomerDoc(uid: string | null | undefined) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(!!uid);
  const authReady = useAuthReady();

  useEffect(() => {
    if (!uid || !authReady) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getDoc(doc(db, "customers", uid).withConverter(customerConverter))
      .then((snap) => {
        if (cancelled) return;
        setCustomer(snap.exists() ? { uid: snap.id, ...snap.data() } : null);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [uid, authReady]);

  return { customer, loading };
}

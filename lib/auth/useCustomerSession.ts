"use client";

import { useEffect, useState } from "react";
import { CUSTOMER_AUTH_CHANGED_EVENT } from "./customerSession";

export interface CustomerSessionInfo {
  name: string | null;
  email: string | null;
}

/**
 * Client-side "am I signed in as a customer" check — fetches GET
 * /api/account/me on mount and again whenever CUSTOMER_AUTH_CHANGED_EVENT
 * fires (login/signup/logout anywhere on the page). Deliberately NOT read
 * from a server-rendered prop: the (store) layout can't read the session
 * cookie itself without forcing every page beneath it into fully dynamic
 * rendering (cookies() is a Next.js "dynamic API"), which would undo the
 * static/ISR behavior the storefront depends on for /, /offers, etc. — see
 * components/store/account-menu.tsx's own comment, the original use of this
 * pattern.
 */
export function useCustomerSession(): { customer: CustomerSessionInfo | null; loading: boolean } {
  const [customer, setCustomer] = useState<CustomerSessionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    function refetch() {
      fetch("/api/account/me")
        .then((res) => (res.ok ? res.json() : { customer: null }))
        .then((data) => {
          if (!cancelled) {
            setCustomer(data.customer ?? null);
            setLoading(false);
          }
        })
        .catch(() => {
          if (!cancelled) setLoading(false);
        });
    }
    refetch();
    window.addEventListener(CUSTOMER_AUTH_CHANGED_EVENT, refetch);
    return () => {
      cancelled = true;
      window.removeEventListener(CUSTOMER_AUTH_CHANGED_EVENT, refetch);
    };
  }, []);

  return { customer, loading };
}

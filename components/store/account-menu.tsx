"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Package, User, UserCircle } from "lucide-react";
import { CUSTOMER_AUTH_CHANGED_EVENT, customerLogout } from "@/lib/auth/customerSession";

type CustomerInfo = { name: string | null; email: string | null };

// Fetched client-side rather than passed down from the (store) layout —
// reading the session cookie there would force cookies(), a Next.js
// "dynamic API", onto every page under it, opting the whole storefront
// (including currently-static/ISR pages like / and /offers) out of static
// generation. This one small route keeps that cost isolated to just the
// account icon, at the cost of it resolving a moment after first paint.
export function AccountMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    function refetch() {
      fetch("/api/account/me")
        .then((res) => (res.ok ? res.json() : { customer: null }))
        .then((data) => {
          if (!cancelled) setCustomer(data.customer ?? null);
        })
        .catch(() => {});
    }
    refetch();
    window.addEventListener(CUSTOMER_AUTH_CHANGED_EVENT, refetch);
    return () => {
      cancelled = true;
      window.removeEventListener(CUSTOMER_AUTH_CHANGED_EVENT, refetch);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!customer) {
    const loginHref = `/account/login?redirect=${encodeURIComponent(pathname || "/")}`;
    return (
      <Link
        href={loginHref}
        aria-label="Sign in"
        className="flex h-11 w-11 cursor-pointer items-center justify-center text-kiswa-gold transition-colors hover:text-kiswa-gold-soft"
      >
        <User size={20} strokeWidth={1.5} />
      </Link>
    );
  }

  const firstName = (customer.name || customer.email || "Account").trim().split(" ")[0];

  async function handleLogout() {
    setOpen(false);
    await customerLogout();
    setCustomer(null);
    router.push("/");
    router.refresh();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-expanded={open}
        className="flex h-11 w-11 cursor-pointer items-center justify-center text-kiswa-gold transition-colors hover:text-kiswa-gold-soft"
      >
        <UserCircle size={20} strokeWidth={1.5} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-lg border border-kiswa-border bg-kiswa-surface shadow-xl"
          >
            <div className="border-b border-kiswa-border px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-kiswa-ink-muted">
                Signed in as
              </p>
              <p className="mt-0.5 truncate text-sm text-kiswa-ink">{firstName}</p>
            </div>
            <nav className="flex flex-col py-1">
              <Link
                href="/account"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-kiswa-ink transition-colors hover:bg-kiswa-surface-2"
              >
                <UserCircle size={16} strokeWidth={1.5} />
                My Account
              </Link>
              <Link
                href="/account/orders"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-kiswa-ink transition-colors hover:bg-kiswa-surface-2"
              >
                <Package size={16} strokeWidth={1.5} />
                My Orders
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex cursor-pointer items-center gap-2.5 border-t border-kiswa-border px-4 py-2.5 text-left text-sm text-kiswa-ink-muted transition-colors hover:bg-kiswa-surface-2 hover:text-red-300"
              >
                <LogOut size={16} strokeWidth={1.5} />
                Log Out
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

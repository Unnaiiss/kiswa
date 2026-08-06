"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Boxes,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Receipt,
  X,
} from "lucide-react";
import { logout } from "@/lib/auth/session";
import type { SessionClaims } from "@/lib/server/sessionCookie";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Products", icon: Package, exact: false },
  { href: "/admin/banners", label: "Banners", icon: ImageIcon, exact: false },
  { href: "/admin/stock", label: "Stock", icon: Boxes, exact: false },
  { href: "/admin/sales", label: "Sales", icon: Receipt, exact: false },
  { href: "/admin/reports", label: "Reports", icon: BarChart3, exact: false },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV_ITEMS.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-amber-400/10 text-amber-400"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-50"
            }`}
          >
            <Icon size={18} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminShell({
  session,
  children,
}: {
  session: SessionClaims;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  async function handleSignOut() {
    await logout();
    router.push("/login");
  }

  return (
    <div className="flex h-dvh flex-col bg-zinc-950 text-zinc-50 md:flex-row">
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-4 py-3 md:hidden">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open menu"
          className="cursor-pointer rounded-lg p-2 text-zinc-400 hover:text-amber-400"
        >
          <Menu size={22} />
        </button>
        <p className="text-sm font-semibold tracking-[0.2em] text-amber-400 uppercase">
          Kiswa Admin
        </p>
        <div className="size-9" />
      </header>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/70"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="relative flex w-64 flex-col border-r border-zinc-800 bg-zinc-950">
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-sm font-semibold tracking-[0.2em] text-amber-400 uppercase">
                Kiswa Admin
              </p>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close menu"
                className="cursor-pointer rounded-full p-1.5 text-zinc-400 hover:text-amber-400"
              >
                <X size={20} />
              </button>
            </div>
            <NavLinks onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </div>
      )}

      <aside className="hidden w-60 shrink-0 flex-col border-r border-zinc-800 md:flex">
        <div className="px-4 py-5">
          <p className="text-sm font-semibold tracking-[0.2em] text-amber-400 uppercase">
            Kiswa Admin
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavLinks />
        </div>
        <div className="border-t border-zinc-800 p-3">
          <p className="truncate px-3 text-xs text-zinc-500">
            {session.name || session.email}
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-2 flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-red-400"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Boxes,
  Image as ImageIcon,
  LayoutDashboard,
  LayoutPanelTop,
  LogOut,
  Menu,
  MessageCircle,
  Package,
  Receipt,
  Store,
  Tag,
  X,
} from "lucide-react";
import { logout } from "@/lib/auth/session";
import { ThemeToggle } from "@/components/theme-toggle";
import type { SessionClaims } from "@/lib/server/sessionCookie";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Products", icon: Package, exact: false },
  { href: "/admin/banners", label: "Banners", icon: ImageIcon, exact: false },
  {
    href: "/admin/home-sections",
    label: "Home Sections",
    icon: LayoutPanelTop,
    exact: false,
  },
  { href: "/admin/combos", label: "Combo Offers", icon: Tag, exact: false },
  { href: "/admin/whatsapp-orders", label: "WhatsApp Orders", icon: MessageCircle, exact: false },
  { href: "/admin/stock", label: "Stock", icon: Boxes, exact: false },
  { href: "/admin/sales", label: "Sales", icon: Receipt, exact: false },
  { href: "/admin/pos-sales", label: "POS Sales", icon: Store, exact: false },
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

/** The current page's own nav label — shown in the mobile header in place
 * of the static "Kiswa Admin" wordmark (which stays as the drawer's own
 * header instead), so a staff member glancing at the top bar can confirm
 * which screen they're on without it eating space better spent on the
 * sign-out button. Falls back to "Dashboard" for the one route (`/admin`
 * itself) that's also the fallback match. */
function currentPageLabel(pathname: string): string {
  const exact = NAV_ITEMS.find((item) => item.exact && pathname === item.href);
  if (exact) return exact.label;
  const prefix = NAV_ITEMS.find((item) => !item.exact && pathname.startsWith(item.href));
  return prefix?.label ?? "Dashboard";
}

function initials(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function ProfileBlock({
  session,
  onSignOut,
}: {
  session: SessionClaims;
  onSignOut: () => void;
}) {
  const displayName = session.name || session.email || "Account";
  return (
    <div className="border-t border-zinc-800 p-3">
      <div className="flex items-center gap-2.5 px-1">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-400/10 text-xs font-semibold text-amber-400">
          {initials(displayName)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm text-zinc-200">{displayName}</p>
          {session.role && (
            <p className="text-[11px] tracking-wide text-zinc-500 capitalize">{session.role}</p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onSignOut}
        className="mt-3 flex w-full cursor-pointer items-center gap-2 rounded-lg border border-zinc-800 px-3 py-2.5 text-sm font-medium text-zinc-300 hover:border-red-400/40 hover:bg-red-400/10 hover:text-red-400"
      >
        <LogOut size={16} />
        Sign out
      </button>
    </div>
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
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  async function handleSignOut() {
    await logout();
    router.push("/login");
  }

  return (
    <div className="flex h-dvh flex-col bg-canvas text-zinc-50 md:flex-row">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-800 px-3 py-3 md:hidden">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open menu"
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-zinc-400 hover:text-amber-400"
        >
          <Menu size={22} />
        </button>
        <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-zinc-50">
          {currentPageLabel(pathname)}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-zinc-400 hover:text-amber-400" />
          {/* Always-visible, one-tap sign-out — previously only reachable
              from the desktop sidebar, which is hidden entirely on mobile,
              so there was no way to sign out from a phone without opening
              the drawer (which, before this, had no sign-out control in it
              either — see ProfileBlock below). */}
          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Sign out"
            title="Sign out"
            className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-zinc-400 hover:text-red-400"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/70"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="relative flex w-72 max-w-[85vw] flex-col border-r border-zinc-800 bg-canvas">
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
            <div className="flex-1 overflow-y-auto">
              <NavLinks onNavigate={() => setMobileNavOpen(false)} />
            </div>
            <ProfileBlock session={session} onSignOut={handleSignOut} />
          </div>
        </div>
      )}

      <aside className="hidden w-60 shrink-0 flex-col border-r border-zinc-800 md:flex">
        <div className="flex items-center justify-between px-4 py-5">
          <p className="text-sm font-semibold tracking-[0.2em] text-amber-400 uppercase">
            Kiswa Admin
          </p>
          <ThemeToggle className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-zinc-400 hover:text-amber-400" />
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavLinks />
        </div>
        <ProfileBlock session={session} onSignOut={handleSignOut} />
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

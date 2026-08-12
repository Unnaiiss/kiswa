import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/account", key: "profile", label: "Profile" },
  { href: "/account/addresses", key: "addresses", label: "Addresses" },
  { href: "/account/orders", key: "orders", label: "My Orders" },
] as const;

export function AccountNav({ active }: { active: (typeof TABS)[number]["key"] }) {
  return (
    <nav className="mt-4 flex gap-5 border-b border-kiswa-border text-sm">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={cn(
            "-mb-px border-b-2 pb-3 transition-colors",
            active === tab.key
              ? "border-kiswa-gold text-kiswa-gold"
              : "border-transparent text-kiswa-ink-muted hover:text-kiswa-ink",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

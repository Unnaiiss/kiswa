"use client";

import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSiteSettings } from "@/lib/store/site-settings-context";
import { SocialIconsRow } from "./contact-block";

const BASE_MENU_LINKS = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/shop?type=oil", label: "Perfume Oils" },
  { href: "/shop?type=spray", label: "Perfume Sprays" },
  { href: "/shop?type=imported", label: "Imported Perfumes" },
  { href: "/offers", label: "Combo Offers" },
  { href: "/gift", label: "Gift a Perfume" },
  { href: "/#our-story", label: "Our Story" },
];

export function MenuDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const settings = useSiteSettings();
  const menuLinks = [
    ...BASE_MENU_LINKS,
    ...(settings.email ? [{ href: `mailto:${settings.email}`, label: "Contact" }] : []),
  ];

  function close() {
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="flex w-full max-w-xs flex-col gap-0 border-r border-kiswa-border bg-kiswa-void text-kiswa-ink"
      >
        <SheetHeader className="border-b border-kiswa-border/80 px-6 py-5">
          <SheetTitle className="font-display text-lg tracking-[0.3em] text-kiswa-ink">
            {settings.brandName}
          </SheetTitle>
        </SheetHeader>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-6">
          {menuLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={close}
              className="cursor-pointer rounded-lg px-3 py-3 text-base font-medium tracking-wide text-kiswa-ink transition-colors hover:bg-kiswa-surface hover:text-kiswa-gold"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-kiswa-border px-6 py-5">
          <SocialIconsRow settings={settings} size="size-11" />
        </div>
      </SheetContent>
    </Sheet>
  );
}

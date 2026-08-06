"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { InstagramIcon } from "./instagram-icon";
import { WHATSAPP_URL, INSTAGRAM_URL, CONTACT_URL } from "@/lib/store/contact-links";

const MENU_LINKS = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/shop?type=oil", label: "Perfume Oils" },
  { href: "/shop?type=spray", label: "Perfume Sprays" },
  { href: "/offers", label: "Combo Offers" },
  { href: "/gift", label: "Gift a Perfume" },
  { href: "/#our-story", label: "Our Story" },
  { href: CONTACT_URL, label: "Contact" },
];

export function MenuDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
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
            KISWA
          </SheetTitle>
        </SheetHeader>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-6">
          {MENU_LINKS.map((link) => (
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

        <div className="flex items-center gap-3 border-t border-kiswa-border px-6 py-5">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat with us on WhatsApp"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-kiswa-border text-kiswa-ink-muted transition-colors hover:border-kiswa-gold/50 hover:text-kiswa-gold"
          >
            <MessageCircle size={18} />
          </a>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Follow us on Instagram"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-kiswa-border text-kiswa-ink-muted transition-colors hover:border-kiswa-gold/50 hover:text-kiswa-gold"
          >
            <InstagramIcon />
          </a>
        </div>
      </SheetContent>
    </Sheet>
  );
}

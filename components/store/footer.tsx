import Link from "next/link";
import { MapPin, MessageCircle } from "lucide-react";
import { WHATSAPP_URL, INSTAGRAM_URL, CONTACT_URL } from "@/lib/store/contact-links";
import { InstagramIcon } from "./instagram-icon";

const FOOTER_LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/#our-story", label: "Our Story" },
  { href: CONTACT_URL, label: "Contact" },
];

export function StoreFooter() {
  return (
    <footer className="border-t border-kiswa-border/80 bg-kiswa-void">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-6 py-14 text-center">
        <span className="font-display text-xl tracking-[0.3em] text-kiswa-ink">
          KISWA
        </span>
        <p className="max-w-md text-sm text-kiswa-ink-muted">
          Pure attar oils, and the sprays crafted from them. Made for those
          who wear fragrance like a second skin.
        </p>

        <nav className="flex flex-wrap justify-center gap-6 text-sm text-kiswa-ink-muted">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="transition-colors hover:text-kiswa-gold"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <p className="flex items-center gap-1.5 text-sm text-kiswa-ink-muted">
          <MapPin size={14} className="text-kiswa-gold-soft" />
          KISWA Attar &amp; Perfume, India
        </p>

        <div className="flex items-center gap-4">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat with us on WhatsApp"
            className="cursor-pointer rounded-full border border-kiswa-border p-2.5 text-kiswa-ink-muted transition-colors hover:border-kiswa-gold/50 hover:text-kiswa-gold"
          >
            <MessageCircle size={18} />
          </a>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Follow us on Instagram"
            className="cursor-pointer rounded-full border border-kiswa-border p-2.5 text-kiswa-ink-muted transition-colors hover:border-kiswa-gold/50 hover:text-kiswa-gold"
          >
            <InstagramIcon />
          </a>
        </div>

        <p className="text-xs text-kiswa-ink-muted/70">
          &copy; 2026 KISWA. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

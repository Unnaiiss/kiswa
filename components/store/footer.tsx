"use client";

import Link from "next/link";
import { useSiteSettings } from "@/lib/store/site-settings-context";
import { ContactBlock } from "./contact-block";

export function StoreFooter() {
  const settings = useSiteSettings();

  const footerLinks = [
    { href: "/shop", label: "Shop" },
    { href: "/#our-story", label: "Our Story" },
    ...(settings.email ? [{ href: `mailto:${settings.email}`, label: "Contact" }] : []),
  ];

  return (
    <footer className="border-t border-kiswa-border/80 bg-kiswa-void">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-6 py-14 text-center">
        <span className="font-display text-xl tracking-[0.3em] text-kiswa-ink">
          {settings.brandName}
        </span>
        <p className="max-w-md text-sm text-kiswa-ink-muted">{settings.shortDescription}</p>

        <nav className="flex flex-wrap justify-center gap-6 text-sm text-kiswa-ink-muted">
          {footerLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="transition-colors hover:text-kiswa-gold"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <ContactBlock settings={settings} />

        <p className="text-xs text-kiswa-ink-muted/70">
          &copy; {new Date().getFullYear()} {settings.brandName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

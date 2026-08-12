"use client";

import { useEffect, useState } from "react";
import { formatInr } from "@/lib/pricing";
import type { CartItem } from "@/lib/cart/types";

/** Single source of truth for the KISWA WhatsApp number — read this
 * everywhere instead of hardcoding the digits in individual components. */
export const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "919995778963";

const ENV_SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");

/**
 * Site origin used to build shareable product links inside WhatsApp
 * messages. Prefers NEXT_PUBLIC_SITE_URL; otherwise falls back to the
 * browser's own origin. Starts empty on the server/first paint (matching
 * SSR output) and fills in via effect after mount, so it never causes a
 * hydration mismatch.
 */
export function useSiteUrl(): string {
  const [url, setUrl] = useState(ENV_SITE_URL);
  useEffect(() => {
    if (!ENV_SITE_URL && typeof window !== "undefined") {
      setUrl(window.location.origin);
    }
  }, []);
  return url;
}

/** `number` defaults to the env-configured number but should be passed
 * explicitly wherever the live siteSettings.whatsappNumber is available
 * (via useSiteSettings) — that Firestore field, not this env var, is the
 * source of truth once the store is running; the env var only seeds it. */
export function buildWhatsAppUrl(message: string, number: string = WHATSAPP_NUMBER): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function buildProductOrderMessage(params: {
  productName: string;
  variantLabel: string;
  qty: number;
  unitPrice: number;
  productUrl: string;
}): string {
  const { productName, variantLabel, qty, unitPrice, productUrl } = params;
  const lineTotal = qty * unitPrice;
  return [
    "Hi KISWA, I'd like to order:",
    "",
    `*${productName}* — ${variantLabel}`,
    `Qty: ${qty} × ${formatInr(unitPrice)} = ${formatInr(lineTotal)}`,
    "",
    `Link: ${productUrl}`,
    "",
    "Please confirm availability.",
  ].join("\n");
}

const CART_MESSAGE_MAX_LINES = 10;

/** Shown near every WhatsApp ordering CTA once online payments are off — the
 * single wording for "this is how you'll actually pay/receive it" reassurance. */
export const WHATSAPP_REASSURANCE_LINE =
  "Order on WhatsApp — we'll confirm availability, payment and delivery with you directly.";

/**
 * One line per cart line, complete enough to bill from without opening the
 * site: fragrance/combo name, variant label, qty, and price. Combo lines add
 * an indented row per component (not just the combo's own title) and gift
 * lines add the recipient/message/wrap choice — this is the message staff
 * use to manually record the order in the WhatsApp Orders screen.
 *
 * `referenceCode`, when given, is a signed-in customer's pendingOrders
 * draft code (see app/api/account/whatsapp-order/route.ts) — included so
 * admin can find and one-click-convert the exact same draft in Admin >
 * WhatsApp Orders instead of re-keying the order from scratch. Absent for
 * guests, who have no draft at all.
 */
export function buildCartOrderMessage(
  items: CartItem[],
  subtotal: number,
  referenceCode?: string,
): string {
  const shown = items.slice(0, CART_MESSAGE_MAX_LINES);
  const remaining = items.length - shown.length;

  const blocks = shown.map((line) => {
    const label = line.combo
      ? line.combo.comboTitle
      : `${line.productName} — ${line.variantLabel}`;
    const rows = [`*${label}* × ${line.qty} = ${formatInr(line.unitPrice * line.qty)}`];

    if (line.combo) {
      for (const c of line.combo.components) {
        rows.push(`   • ${c.productName} — ${c.variantLabel}${c.qty > 1 ? ` ×${c.qty}` : ""}`);
      }
    }

    if (line.gift) {
      rows.push(
        `   🎁 Gift for ${line.gift.recipientName}${line.gift.giftWrap ? " (gift-wrapped)" : ""}`,
      );
      if (line.gift.message) rows.push(`   "${line.gift.message}"`);
    }

    return rows.join("\n");
  });

  if (remaining > 0) {
    blocks.push(`…and ${remaining} more item${remaining === 1 ? "" : "s"}`);
  }

  return [
    "Hi KISWA, I'd like to order:",
    "",
    ...blocks,
    "",
    `Order total: ${formatInr(subtotal)}`,
    "",
    ...(referenceCode ? [`Reference: ${referenceCode}`, ""] : []),
    "Please confirm availability.",
  ].join("\n");
}

export function buildGenericInquiryMessage(): string {
  return "Hi KISWA, I have a question";
}

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

export function buildWhatsAppUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
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

export function buildCartOrderMessage(items: CartItem[], subtotal: number): string {
  const shown = items.slice(0, CART_MESSAGE_MAX_LINES);
  const remaining = items.length - shown.length;

  const lines = shown.map((line) => {
    const label = line.combo
      ? line.combo.comboTitle
      : `${line.productName} — ${line.variantLabel}`;
    return `*${label}* × ${line.qty} = ${formatInr(line.unitPrice * line.qty)}`;
  });

  if (remaining > 0) {
    lines.push(`…and ${remaining} more item${remaining === 1 ? "" : "s"}`);
  }

  return [
    "Hi KISWA, I'd like to order:",
    "",
    ...lines,
    "",
    `Order total: ${formatInr(subtotal)}`,
    "",
    "Please confirm availability.",
  ].join("\n");
}

export function buildGenericInquiryMessage(): string {
  return "Hi KISWA, I have a question";
}

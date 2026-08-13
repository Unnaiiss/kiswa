"use client";

import { useState } from "react";
import { buildCartOrderMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { useCustomerSession } from "@/lib/auth/useCustomerSession";
import { REQUIRE_LOGIN_TO_ORDER } from "@/lib/config/featureFlags";
import { SignInToOrderPrompt } from "./sign-in-to-order-prompt";
import type { CartItem } from "@/lib/cart/types";

/**
 * The cart drawer's "Order on WhatsApp" action. A guest gets the exact same
 * plain link as before (buildCartOrderMessage, no server round-trip) — this
 * flow is completely unchanged for them. A signed-in customer instead first
 * creates a pendingOrders draft (POST /api/account/whatsapp-order, which
 * captures their uid, cart contents, and default saved address) and gets
 * back a short reference code included in the WhatsApp message, so admin
 * can find and one-click-convert this exact draft later instead of
 * re-keying the order from scratch. If the draft call fails for any reason
 * (network blip etc.), this still falls back to opening WhatsApp WITHOUT a
 * reference code rather than blocking the order entirely — the WhatsApp
 * handoff must never be blocked by this enhancement.
 */
export function WhatsAppOrderLink({
  items,
  subtotal,
  whatsappNumber,
  onNavigate,
  className,
  children,
}: {
  items: CartItem[];
  subtotal: number;
  whatsappNumber: string;
  onNavigate?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const { customer } = useCustomerSession();
  const [submitting, setSubmitting] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);

  if (!customer) {
    if (REQUIRE_LOGIN_TO_ORDER) {
      return (
        <>
          <button type="button" onClick={() => setPromptOpen(true)} className={className}>
            {children}
          </button>
          <SignInToOrderPrompt open={promptOpen} onClose={() => setPromptOpen(false)} />
        </>
      );
    }
    return (
      <a
        href={buildWhatsAppUrl(buildCartOrderMessage(items, subtotal), whatsappNumber)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onNavigate}
        className={className}
      >
        {children}
      </a>
    );
  }

  async function handleClick() {
    setSubmitting(true);
    let referenceCode: string | undefined;
    try {
      const res = await fetch("/api/account/whatsapp-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) =>
            i.combo
              ? { kind: "combo" as const, comboId: i.combo.comboId, qty: i.qty, selections: i.combo.selections }
              : { kind: "product" as const, productId: i.productId, variantId: i.variantId, qty: i.qty },
          ),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        referenceCode = data.referenceCode;
      }
    } catch {
      // Swallow — see the component doc comment: never block the WhatsApp
      // handoff over a failed draft creation.
    }
    setSubmitting(false);
    window.open(
      buildWhatsAppUrl(buildCartOrderMessage(items, subtotal, referenceCode), whatsappNumber),
      "_blank",
      "noopener,noreferrer",
    );
    onNavigate?.();
  }

  return (
    <button type="button" onClick={handleClick} disabled={submitting} className={className}>
      {children}
    </button>
  );
}

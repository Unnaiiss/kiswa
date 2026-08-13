"use client";

import { useState } from "react";
import { useCustomerSession } from "./useCustomerSession";
import { REQUIRE_LOGIN_TO_ORDER } from "@/lib/config/featureFlags";

/**
 * The single place that decides whether an order-placing action (WhatsApp
 * order, Checkout) should be intercepted with components/store/
 * sign-in-to-order-prompt.tsx instead of proceeding — used by every order
 * entry point (whatsapp-order-link.tsx, variant-selector.tsx,
 * imported-buy-box.tsx, cart-drawer.tsx's Checkout link) so they can never
 * disagree about when the gate applies. `blocked` mirrors
 * WhatsAppOrderLink's own existing `!customer` check (ignoring the brief
 * loading window before useCustomerSession resolves) — defaulting to
 * "needs sign-in" while unresolved is the conservative choice: it very
 * occasionally shows an already-signed-in visitor a redundant prompt for a
 * fraction of a second, rather than ever letting an actual guest through.
 */
export function useOrderGate() {
  const { customer } = useCustomerSession();
  const [promptOpen, setPromptOpen] = useState(false);

  const blocked = REQUIRE_LOGIN_TO_ORDER && !customer;

  return {
    blocked,
    promptOpen,
    openPrompt: () => setPromptOpen(true),
    closePrompt: () => setPromptOpen(false),
  };
}

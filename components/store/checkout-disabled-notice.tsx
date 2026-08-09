"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { useCart } from "./cart-provider";

/**
 * Rendered at /checkout instead of CheckoutForm while online payments are
 * off (see lib/config/featureFlags.ts). Opens the cart drawer and sends the
 * customer back to the storefront rather than leaving /checkout as a dead
 * end — CheckoutForm (and the Razorpay script it lazily loads) never mounts.
 */
export function CheckoutDisabledNotice() {
  const router = useRouter();
  const { open } = useCart();

  useEffect(() => {
    open();
    router.replace("/");
  }, [open, router]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-32 text-center">
      <ShoppingBag className="text-kiswa-ink-muted" size={40} />
      <p className="text-kiswa-ink-muted">
        Online checkout isn&apos;t available right now — taking you to your bag to order on
        WhatsApp instead.
      </p>
    </div>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/store/checkout-form";
import { CheckoutDisabledNotice } from "@/components/store/checkout-disabled-notice";
import { ONLINE_PAYMENTS_ENABLED, REQUIRE_LOGIN_TO_ORDER } from "@/lib/config/featureFlags";
import { getCustomerSession } from "@/lib/server/getCustomerSession";

export const metadata: Metadata = {
  title: "Checkout",
};

export default async function CheckoutPage() {
  // The cart drawer's own "Checkout" button already gates this with a
  // friendlier in-place prompt (components/store/sign-in-to-order-prompt.tsx)
  // before ever navigating here — this is just the defensive fallback for
  // someone reaching /checkout directly (a bookmark, a shared link). The
  // cart itself is untouched (still in localStorage) either way, so landing
  // back here after signing in resumes exactly where they left off.
  if (ONLINE_PAYMENTS_ENABLED && REQUIRE_LOGIN_TO_ORDER) {
    const session = await getCustomerSession();
    if (!session) redirect("/account/login?redirect=/checkout");
  }

  return (
    <main className="flex flex-1 flex-col">
      {ONLINE_PAYMENTS_ENABLED ? <CheckoutForm /> : <CheckoutDisabledNotice />}
    </main>
  );
}

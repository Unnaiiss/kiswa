import type { Metadata } from "next";
import { CheckoutForm } from "@/components/store/checkout-form";
import { CheckoutDisabledNotice } from "@/components/store/checkout-disabled-notice";
import { ONLINE_PAYMENTS_ENABLED } from "@/lib/config/featureFlags";

export const metadata: Metadata = {
  title: "Checkout",
};

export default function CheckoutPage() {
  return (
    <main className="flex flex-1 flex-col">
      {ONLINE_PAYMENTS_ENABLED ? <CheckoutForm /> : <CheckoutDisabledNotice />}
    </main>
  );
}

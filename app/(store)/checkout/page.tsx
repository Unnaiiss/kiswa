import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/store/checkout-form";
import { CheckoutDisabledNotice } from "@/components/store/checkout-disabled-notice";
import { ONLINE_PAYMENTS_ENABLED } from "@/lib/config/featureFlags";
import { getCustomerSession } from "@/lib/server/getCustomerSession";
import { listAddresses } from "@/lib/server/customerAddresses";
import { getCheckoutSettings } from "@/lib/store/queries";

export const metadata: Metadata = {
  title: "Checkout",
};

export default async function CheckoutPage() {
  if (!ONLINE_PAYMENTS_ENABLED) {
    return (
      <main className="flex flex-1 flex-col">
        <CheckoutDisabledNotice />
      </main>
    );
  }

  // Checkout is signed-in-customer only, unconditionally (not gated by
  // REQUIRE_LOGIN_TO_ORDER — that flag controls whether TAPPING the order
  // button prompts sign-in as a conversion lever; this page's own address
  // book design inherently needs an account regardless of that flag's
  // value, so a guest reaching /checkout directly always redirects here).
  const session = await getCustomerSession();
  if (!session) redirect("/account/login?redirect=/checkout");

  const [addresses, { codEnabled }] = await Promise.all([
    listAddresses(session.uid),
    getCheckoutSettings(),
  ]);
  // Timestamps can't cross the RSC boundary into the client AddressForm/
  // address picker — same reasoning as /(store)/account/addresses/page.tsx.
  const plainAddresses = addresses.map(({ createdAt, updatedAt, ...rest }) => {
    void createdAt;
    void updatedAt;
    return rest;
  });

  return (
    <main className="flex flex-1 flex-col">
      <CheckoutForm initialAddresses={plainAddresses} codEnabled={codEnabled} />
    </main>
  );
}

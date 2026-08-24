import type { Metadata } from "next";
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

  // Guest checkout: unlike the earlier "signed-in-customer only" version of
  // this page, a visitor with no session is no longer redirected away —
  // they see CheckoutForm's own guest/sign-in/create-account chooser
  // instead (see that component). A signed-in customer still gets their
  // saved address book exactly as before.
  const session = await getCustomerSession();
  const [addresses, { codEnabled }] = await Promise.all([
    session ? listAddresses(session.uid) : Promise.resolve([]),
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
      <CheckoutForm
        initialAddresses={plainAddresses}
        codEnabled={codEnabled}
        customer={session ? { name: session.name, email: session.email } : null}
      />
    </main>
  );
}

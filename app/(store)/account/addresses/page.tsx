import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/server/getCustomerSession";
import { listAddresses } from "@/lib/server/customerAddresses";
import { AccountNav } from "@/components/account/account-nav";
import { AddressList } from "@/components/account/address-list";

export const metadata: Metadata = {
  title: "My Addresses",
};

export default async function AccountAddressesPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/account/login?redirect=/account/addresses");

  const addresses = await listAddresses(session.uid);
  // Timestamps can't cross the RSC boundary into the client AddressList —
  // same reasoning as lib/store/queries.ts's StoreProduct stripping
  // createdAt for the exact same structural reason.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const plainAddresses = addresses.map(({ createdAt, updatedAt, ...rest }) => rest);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16 sm:py-20">
      <p className="text-xs uppercase tracking-[0.4em] text-kiswa-gold-soft">Account</p>
      <h1 className="mt-3 font-display text-4xl text-kiswa-ink sm:text-5xl">My Addresses</h1>

      <AccountNav active="addresses" />

      <div className="mt-8">
        <AddressList initialAddresses={plainAddresses} />
      </div>
    </main>
  );
}

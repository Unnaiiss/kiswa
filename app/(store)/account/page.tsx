import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/server/getCustomerSession";
import { getCustomerProfile } from "@/lib/server/customers";
import { AccountProfileForm } from "@/components/account/account-profile-form";

export const metadata: Metadata = {
  title: "My Account",
};

export default async function AccountPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/account/login?redirect=/account");

  const profile = await getCustomerProfile(session.uid);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16 sm:py-20">
      <p className="text-xs uppercase tracking-[0.4em] text-kiswa-gold-soft">Account</p>
      <h1 className="mt-3 font-display text-4xl text-kiswa-ink sm:text-5xl">My Account</h1>

      <div className="mt-4 flex gap-4 text-sm">
        <Link href="/account" className="text-kiswa-gold">
          Profile
        </Link>
        <Link href="/account/orders" className="text-kiswa-ink-muted hover:text-kiswa-ink">
          My Orders
        </Link>
      </div>

      <div className="mt-8 rounded-lg border border-kiswa-border bg-kiswa-surface p-6 sm:p-8">
        <AccountProfileForm
          email={profile?.email ?? session.email ?? ""}
          initialName={profile?.name ?? session.name ?? ""}
          initialPhone={profile?.phone ?? ""}
          initialMarketingOptIn={profile?.marketingOptIn ?? false}
        />
      </div>
    </main>
  );
}

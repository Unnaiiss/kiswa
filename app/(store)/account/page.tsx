import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MapPin, PackageSearch } from "lucide-react";
import { getCustomerSession } from "@/lib/server/getCustomerSession";
import { getCustomerProfile } from "@/lib/server/customers";
import { AccountNav } from "@/components/account/account-nav";
import { AccountProfileForm } from "@/components/account/account-profile-form";
import { AccountPasswordForm } from "@/components/account/account-password-form";

export const metadata: Metadata = {
  title: "My Account",
};

export default async function AccountPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/account/login?redirect=/account");

  const profile = await getCustomerProfile(session.uid);
  const firstName = (profile?.name || session.name || profile?.email || "there").trim().split(" ")[0];

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16 sm:py-20">
      <p className="text-xs uppercase tracking-[0.4em] text-kiswa-gold-soft">Account</p>
      <h1 className="mt-3 font-display text-4xl text-kiswa-ink sm:text-5xl">Hi, {firstName}</h1>
      <p className="mt-2 text-kiswa-ink-muted">Welcome back to your KISWA account.</p>

      <AccountNav active="profile" />

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/account/addresses"
          className="flex items-center gap-4 rounded-lg border border-kiswa-border bg-kiswa-surface p-5 transition-colors hover:border-kiswa-gold/40"
        >
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-kiswa-gold/10 text-kiswa-gold">
            <MapPin size={20} />
          </div>
          <div>
            <p className="text-kiswa-ink">My Addresses</p>
            <p className="text-sm text-kiswa-ink-muted">Manage delivery addresses</p>
          </div>
        </Link>

        <Link
          href="/account/orders"
          className="flex items-center gap-4 rounded-lg border border-kiswa-border bg-kiswa-surface p-5 transition-colors hover:border-kiswa-gold/40"
        >
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-kiswa-gold/10 text-kiswa-gold">
            <PackageSearch size={20} />
          </div>
          <div>
            <p className="text-kiswa-ink">My Orders</p>
            <p className="text-sm text-kiswa-ink-muted">Track and review orders</p>
          </div>
        </Link>
      </div>

      <div className="mt-8 rounded-lg border border-kiswa-border bg-kiswa-surface p-6 sm:p-8">
        <h2 className="font-display text-xl text-kiswa-ink">Profile</h2>
        <div className="mt-4">
          <AccountProfileForm
            email={profile?.email ?? session.email ?? ""}
            initialName={profile?.name ?? session.name ?? ""}
            initialPhone={profile?.phone ?? ""}
            initialMarketingOptIn={profile?.marketingOptIn ?? false}
          />
        </div>
      </div>

      <div className="mt-6">
        <AccountPasswordForm />
      </div>
    </main>
  );
}

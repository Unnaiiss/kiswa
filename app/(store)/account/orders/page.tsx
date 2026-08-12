import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PackageSearch } from "lucide-react";
import { getCustomerSession } from "@/lib/server/getCustomerSession";
import { getSiteSettings } from "@/lib/store/queries";

export const metadata: Metadata = {
  title: "My Orders",
};

// Order history isn't wired up yet — sales/orders aren't linked to a
// customer uid at checkout time in this pass (see CLAUDE.md's "Launch
// without online payments" section and the customer-accounts note below).
// This page exists so the header dropdown's "My Orders" link has somewhere
// real to go rather than 404ing, without touching the ordering flow.
export default async function AccountOrdersPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/account/login?redirect=/account/orders");

  const { whatsappNumber } = await getSiteSettings();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16 sm:py-20">
      <p className="text-xs uppercase tracking-[0.4em] text-kiswa-gold-soft">Account</p>
      <h1 className="mt-3 font-display text-4xl text-kiswa-ink sm:text-5xl">My Orders</h1>

      <div className="mt-4 flex gap-4 text-sm">
        <Link href="/account" className="text-kiswa-ink-muted hover:text-kiswa-ink">
          Profile
        </Link>
        <Link href="/account/orders" className="text-kiswa-gold">
          My Orders
        </Link>
      </div>

      <div className="mt-8 flex flex-col items-center gap-4 rounded-lg border border-kiswa-border bg-kiswa-surface px-6 py-16 text-center">
        <PackageSearch className="text-kiswa-ink-muted" size={40} />
        <p className="text-kiswa-ink-muted">
          Order history isn&apos;t connected here yet — for now, orders are placed and
          confirmed over WhatsApp.
        </p>
        <a
          href={`https://wa.me/${whatsappNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium tracking-wide text-kiswa-gold underline underline-offset-4 hover:text-kiswa-gold-soft"
        >
          Chat with us on WhatsApp
        </a>
      </div>
    </main>
  );
}

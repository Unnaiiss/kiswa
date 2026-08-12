import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PackageSearch } from "lucide-react";
import { getCustomerSession } from "@/lib/server/getCustomerSession";
import { getSiteSettings } from "@/lib/store/queries";
import { getCustomerOrders } from "@/lib/server/customerOrders";
import { AccountNav } from "@/components/account/account-nav";
import { OrderStatusBadge } from "@/components/account/order-status-badge";
import { formatInr } from "@/lib/pricing";
import { itemVariantLabel } from "@/lib/admin/salesAggregation";

export const metadata: Metadata = {
  title: "My Orders",
};

export default async function AccountOrdersPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/account/login?redirect=/account/orders");

  const [orders, { whatsappNumber }] = await Promise.all([
    getCustomerOrders(session.uid),
    getSiteSettings(),
  ]);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16 sm:py-20">
      <p className="text-xs uppercase tracking-[0.4em] text-kiswa-gold-soft">Account</p>
      <h1 className="mt-3 font-display text-4xl text-kiswa-ink sm:text-5xl">My Orders</h1>

      <AccountNav active="orders" />

      {orders.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-4 rounded-lg border border-kiswa-border bg-kiswa-surface px-6 py-16 text-center">
          <PackageSearch className="text-kiswa-ink-muted" size={40} />
          <div>
            <p className="text-kiswa-ink">No orders yet</p>
            <p className="mt-1 text-sm text-kiswa-ink-muted">
              Orders placed on WhatsApp while signed in will show up here once confirmed.
            </p>
          </div>
          <a
            href={`https://wa.me/${whatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium tracking-wide text-kiswa-gold underline underline-offset-4 hover:text-kiswa-gold-soft"
          >
            Chat with us on WhatsApp
          </a>
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/account/orders/${order.id}`}
              className="flex flex-col gap-3 rounded-lg border border-kiswa-border bg-kiswa-surface p-5 transition-colors hover:border-kiswa-gold/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-kiswa-ink">{order.invoiceNo}</p>
                  <p className="text-xs text-kiswa-ink-muted">
                    {order.createdAt.toDate().toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <OrderStatusBadge status={order.orderStatus} />
              </div>

              <p className="text-sm text-kiswa-ink-muted">
                {order.items
                  .slice(0, 2)
                  .map((item) => (item.comboTitle ? item.comboTitle : `${item.productName} — ${itemVariantLabel(item)}`))
                  .join(", ")}
                {order.items.length > 2 ? `, +${order.items.length - 2} more` : ""}
              </p>

              <p className="text-right font-display text-lg text-kiswa-gold">{formatInr(order.total)}</p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

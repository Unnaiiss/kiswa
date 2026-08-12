import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import { customersCollection } from "@/lib/firestore/admin-collections";
import { getCustomerOrders } from "@/lib/server/customerOrders";
import { formatInr } from "@/lib/pricing";
import { itemVariantLabel } from "@/lib/admin/salesAggregation";

export const metadata: Metadata = {
  title: "Customer profile",
};

interface CustomerProfilePageProps {
  params: Promise<{ uid: string }>;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-zinc-500/15 text-zinc-300",
  paid: "bg-amber-400/15 text-amber-400",
  packed: "bg-sky-500/15 text-sky-300",
  shipped: "bg-purple-500/15 text-purple-300",
  delivered: "bg-green-500/15 text-green-300",
  cancelled: "bg-red-500/15 text-red-300",
};

export default async function AdminCustomerProfilePage({ params }: CustomerProfilePageProps) {
  const { uid } = await params;

  const customerSnap = await customersCollection().doc(uid).get();
  const customer = customerSnap.data();
  if (!customerSnap.exists || !customer) notFound();

  const orders = await getCustomerOrders(uid);
  const lifetimeTotal = orders.reduce((sum, o) => sum + o.total, 0);
  const cancelledCount = orders.filter((o) => o.orderStatus === "cancelled").length;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div>
        <Link
          href="/admin/sales"
          className="flex w-fit cursor-pointer items-center gap-1.5 text-sm text-zinc-400 hover:text-amber-400"
        >
          <ArrowLeft size={14} />
          Back to Sales
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-zinc-50">{customer.name || "Unnamed customer"}</h1>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-400">
          <span className="flex items-center gap-1.5">
            <Mail size={13} />
            {customer.email}
          </span>
          {customer.phone && (
            <span className="flex items-center gap-1.5">
              <Phone size={13} />
              {customer.phone}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Joined {customer.createdAt.toDate().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-xs text-zinc-500 uppercase">Lifetime orders</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-50">{orders.length}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-xs text-zinc-500 uppercase">Lifetime total</p>
          <p className="mt-1 text-2xl font-semibold text-amber-400">{formatInr(lifetimeTotal)}</p>
        </div>
        {cancelledCount > 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-xs text-zinc-500 uppercase">Cancelled</p>
            <p className="mt-1 text-2xl font-semibold text-red-400">{cancelledCount}</p>
          </div>
        )}
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold text-zinc-50">Order history</p>
        {orders.length === 0 ? (
          <p className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center text-sm text-zinc-500">
            No orders linked to this account yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-800">
            <ul className="divide-y divide-zinc-800">
              {orders.map((order) => (
                <li key={order.id} className="flex items-center justify-between gap-4 bg-zinc-900/50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-50">{order.invoiceNo}</p>
                    <p className="text-xs text-zinc-500">
                      {order.createdAt.toDate().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} ·{" "}
                      {order.items
                        .slice(0, 2)
                        .map((item) => (item.comboTitle ? item.comboTitle : `${item.productName} — ${itemVariantLabel(item)}`))
                        .join(", ")}
                      {order.items.length > 2 ? `, +${order.items.length - 2} more` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${STATUS_STYLES[order.orderStatus] ?? "bg-zinc-500/15 text-zinc-300"}`}
                    >
                      {order.orderStatus}
                    </span>
                    <span className="text-sm font-semibold text-zinc-50">{formatInr(order.total)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

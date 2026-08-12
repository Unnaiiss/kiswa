import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCustomerSession } from "@/lib/server/getCustomerSession";
import { getCustomerOrder } from "@/lib/server/customerOrders";
import { OrderInvoice } from "@/components/store/order-invoice";
import { OrderStatusBadge } from "@/components/account/order-status-badge";

export const metadata: Metadata = {
  title: "Order details",
};

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AccountOrderDetailPage({ params }: OrderDetailPageProps) {
  const session = await getCustomerSession();
  const { id } = await params;
  if (!session) redirect(`/account/login?redirect=${encodeURIComponent(`/account/orders/${id}`)}`);

  // getCustomerOrder returns null both when the order doesn't exist AND when
  // it belongs to someone else — notFound() either way, so probing another
  // customer's order id can never distinguish "doesn't exist" from "exists
  // but isn't yours".
  const order = await getCustomerOrder(session.uid, id);
  if (!order) notFound();

  const { createdAt, ...orderForInvoice } = order;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-6 py-16 text-center sm:py-20">
      <Link
        href="/account/orders"
        className="mb-6 flex w-full cursor-pointer items-center gap-1.5 text-left text-sm text-kiswa-ink-muted hover:text-kiswa-ink"
      >
        <ArrowLeft size={14} />
        Back to My Orders
      </Link>

      <p className="text-xs uppercase tracking-[0.4em] text-kiswa-gold-soft">Order</p>
      <h1 className="mt-3 font-display text-4xl text-kiswa-ink">{order.invoiceNo}</h1>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <OrderStatusBadge status={order.orderStatus} />
        <span className="rounded-full bg-kiswa-surface-2 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-kiswa-ink-muted">
          {order.paymentMethod} · {order.paymentStatus}
        </span>
      </div>

      <OrderInvoice sale={orderForInvoice} createdAt={createdAt.toDate()} />
    </main>
  );
}

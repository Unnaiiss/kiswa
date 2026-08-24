import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOrderByToken } from "@/lib/server/customerOrders";
import { OrderInvoice } from "@/components/store/order-invoice";
import { OrderStatusBadge } from "@/components/account/order-status-badge";
import { DeliveryTimeline } from "@/components/account/delivery-timeline";
import { normalizeOrderStatus } from "@/lib/orderFulfillment";

export const metadata: Metadata = {
  title: "Order details",
};

interface GuestOrderPageProps {
  params: Promise<{ token: string }>;
}

/**
 * The no-login order link — see lib/server/customerOrders.ts's
 * getOrderByToken for the actual security boundary (the high-entropy
 * token itself, not any session check). Deliberately near-identical to
 * /(store)/account/orders/[id]/page.tsx (same OrderInvoice/DeliveryTimeline
 * components, same layout) so a guest's experience matches a registered
 * customer's order detail page exactly — the only difference is how the
 * order was looked up.
 */
export default async function GuestOrderPage({ params }: GuestOrderPageProps) {
  const { token } = await params;
  const order = await getOrderByToken(token);
  if (!order) notFound();

  const { createdAt, statusHistory, shipping, ...orderForInvoice } = order;

  const deliveryHistory = (statusHistory ?? []).map((entry) => ({
    status: normalizeOrderStatus(entry.status),
    timestampMs: entry.timestamp.toDate().getTime(),
  }));

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-6 py-16 text-center sm:py-20">
      <p className="text-xs uppercase tracking-[0.4em] text-kiswa-gold-soft">Order</p>
      <h1 className="mt-3 font-display text-4xl text-kiswa-ink">{order.invoiceNo}</h1>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <OrderStatusBadge status={order.orderStatus} />
        <span className="rounded-full bg-kiswa-surface-2 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-kiswa-ink-muted">
          {order.paymentMethod} · {order.paymentStatus}
        </span>
      </div>

      <p className="mt-4 max-w-md text-xs text-kiswa-ink-muted">
        Bookmark this page or save its link — it&apos;s the only way to come back to this order
        without an account.
      </p>

      <div className="mt-10 w-full rounded-2xl border border-kiswa-border bg-kiswa-surface p-6">
        <p className="mb-4 text-xs tracking-[0.3em] text-kiswa-gold-soft uppercase">Delivery status</p>
        <DeliveryTimeline
          currentStatus={normalizeOrderStatus(order.orderStatus)}
          history={deliveryHistory}
          shipping={shipping}
        />
      </div>

      <OrderInvoice sale={orderForInvoice} createdAt={createdAt.toDate()} />
    </main>
  );
}

import type { OrderStatus } from "@/lib/firestore/types";
import { normalizeOrderStatus, ORDER_STATUS_LABELS } from "@/lib/orderFulfillment";

const STYLES: Record<OrderStatus, string> = {
  pending: "bg-zinc-500/15 text-zinc-300",
  confirmed: "bg-kiswa-gold/15 text-kiswa-gold",
  packed: "bg-sky-500/15 text-sky-300",
  shipped: "bg-purple-500/15 text-purple-300",
  out_for_delivery: "bg-indigo-500/15 text-indigo-300",
  delivered: "bg-green-500/15 text-green-300",
  cancelled: "bg-red-500/15 text-red-300",
  returned: "bg-orange-500/15 text-orange-300",
};

export function OrderStatusBadge({ status }: { status: OrderStatus | string }) {
  const normalized = normalizeOrderStatus(status);
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${STYLES[normalized]}`}
    >
      {ORDER_STATUS_LABELS[normalized]}
    </span>
  );
}

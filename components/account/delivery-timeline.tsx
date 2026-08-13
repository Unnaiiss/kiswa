import { CheckCircle2, Circle, ExternalLink, Truck } from "lucide-react";
import { ORDER_STATUS_LABELS, ORDER_STATUS_SEQUENCE } from "@/lib/orderFulfillment";
import type { OrderStatus } from "@/lib/firestore/types";

const DELIVERY_STEPS: OrderStatus[] = [
  "confirmed",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
];

export interface DeliveryTimelineHistoryEntry {
  status: OrderStatus;
  timestampMs: number;
}

export interface DeliveryTimelineShipping {
  courierName: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
}

function formatStepDate(ms: number): string {
  return new Date(ms).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Presentational-only, no data fetching — works from a pre-normalized
 * history array of plain {status, timestampMs} pairs so it's usable both
 * from /account/orders/[id] (a real Sale, TimestampLike -> .toDate().getTime())
 * and from the public /track lookup (JSON over the wire, ISO string ->
 * new Date(...).getTime()). currentStatus should already be normalized
 * (see lib/orderFulfillment.ts's normalizeOrderStatus) — this component
 * doesn't re-normalize legacy "paid" values itself.
 */
export function DeliveryTimeline({
  currentStatus,
  history,
  shipping,
}: {
  currentStatus: OrderStatus;
  history: DeliveryTimelineHistoryEntry[];
  shipping?: DeliveryTimelineShipping | null;
}) {
  const isTerminal = currentStatus === "cancelled" || currentStatus === "returned";
  const currentIdx = ORDER_STATUS_SEQUENCE.indexOf(currentStatus);

  function timestampFor(status: OrderStatus): number | null {
    const entries = history.filter((h) => h.status === status);
    return entries.length > 0 ? entries[entries.length - 1].timestampMs : null;
  }

  // A cancelled/returned order has no reachable currentIdx along the
  // sequence, so "reached" for terminal orders relies purely on which steps
  // actually have a history entry — a terminal order that was cancelled
  // while still 'pending' correctly shows none of the 5 steps reached.
  function isReached(step: OrderStatus): boolean {
    if (isTerminal) return timestampFor(step) !== null;
    return currentIdx >= ORDER_STATUS_SEQUENCE.indexOf(step);
  }

  const terminalTimestamp = isTerminal ? timestampFor(currentStatus) : null;

  return (
    <div className="flex w-full flex-col gap-4 text-left">
      {isTerminal && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            currentStatus === "cancelled"
              ? "border-red-400/30 bg-red-400/5 text-red-300"
              : "border-orange-400/30 bg-orange-400/5 text-orange-300"
          }`}
        >
          <p className="font-semibold">
            Order {currentStatus === "cancelled" ? "cancelled" : "returned"}
            {terminalTimestamp !== null ? ` — ${formatStepDate(terminalTimestamp)}` : ""}
          </p>
        </div>
      )}

      <ol className="flex flex-col">
        {DELIVERY_STEPS.map((step, idx) => {
          const reached = isReached(step);
          const ts = timestampFor(step);
          const isLast = idx === DELIVERY_STEPS.length - 1;
          const nextReached = !isLast && isReached(DELIVERY_STEPS[idx + 1]);
          return (
            <li key={step} className="flex gap-3">
              <div className="flex flex-col items-center">
                {reached ? (
                  <CheckCircle2 size={20} className="shrink-0 text-kiswa-gold" />
                ) : (
                  <Circle size={20} className="shrink-0 text-kiswa-ink-muted/40" />
                )}
                {!isLast && (
                  <div
                    className={`w-px flex-1 ${nextReached ? "bg-kiswa-gold" : "bg-kiswa-border"}`}
                    style={{ minHeight: "1.75rem" }}
                  />
                )}
              </div>
              <div className={isLast ? "pb-1" : "pb-6"}>
                <p
                  className={`text-sm font-medium ${reached ? "text-kiswa-ink" : "text-kiswa-ink-muted"}`}
                >
                  {ORDER_STATUS_LABELS[step]}
                </p>
                {ts !== null && (
                  <p className="text-xs text-kiswa-ink-muted">{formatStepDate(ts)}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {shipping && (shipping.courierName || shipping.trackingNumber || shipping.trackingUrl) && (
        <div className="rounded-lg border border-kiswa-border bg-kiswa-surface-2 p-3 text-sm">
          <p className="flex items-center gap-1.5 text-xs tracking-wide text-kiswa-ink-muted uppercase">
            <Truck size={13} />
            Courier &amp; tracking
          </p>
          {shipping.courierName && <p className="mt-1 text-kiswa-ink">{shipping.courierName}</p>}
          {shipping.trackingNumber && (
            <p className="text-kiswa-ink-muted">{shipping.trackingNumber}</p>
          )}
          {shipping.trackingUrl && (
            <a
              href={shipping.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-kiswa-gold underline underline-offset-2 hover:text-kiswa-gold-soft"
            >
              Track shipment
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

import type { OrderStatus, SaleItem } from "@/lib/firestore/types";

/** Forward-progression order — see OrderStatus's own doc comment.
 * 'cancelled'/'returned' are handled separately in
 * isValidStatusTransition, not part of this linear sequence. */
export const ORDER_STATUS_SEQUENCE: OrderStatus[] = [
  "pending",
  "confirmed",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
];

export const TERMINAL_ORDER_STATUSES: OrderStatus[] = ["cancelled", "returned"];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  packed: "Packed",
  shipped: "Shipped",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

/** Sales recorded before this feature shipped may still hold the literal
 * string "paid" (the old name for the same fulfillment step now called
 * 'confirmed') — this is the one place that gets normalized for display/
 * transition-checking, never bulk-migrated in Firestore itself. Anything
 * else unrecognized falls back to 'pending' rather than throwing, so a
 * stray/corrupt value can't crash a page. */
export function normalizeOrderStatus(status: string): OrderStatus {
  if (status === "paid") return "confirmed";
  if ((ORDER_STATUS_SEQUENCE as string[]).includes(status) || (TERMINAL_ORDER_STATUSES as string[]).includes(status)) {
    return status as OrderStatus;
  }
  return "pending";
}

/**
 * The single source of truth for which status transitions are legal —
 * used both to gate the actual write (lib/server/orderFulfillment.ts) and
 * to decide which buttons/options the admin UI even offers, so the two can
 * never disagree. Forward-only along ORDER_STATUS_SEQUENCE; 'cancelled' is
 * reachable from anything before 'delivered'; 'returned' only from
 * 'delivered'; nothing is reachable from either terminal state (a
 * cancelled order can't be re-cancelled, returned, or un-cancelled here —
 * see the module doc in lib/server/orderFulfillment.ts for why that's a
 * deliberate scope boundary, not an oversight).
 */
export function isValidStatusTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return false;
  if (TERMINAL_ORDER_STATUSES.includes(from)) return false;
  if (to === "cancelled") return from !== "delivered";
  if (to === "returned") return from === "delivered";
  const fromIdx = ORDER_STATUS_SEQUENCE.indexOf(from);
  const toIdx = ORDER_STATUS_SEQUENCE.indexOf(to);
  if (fromIdx === -1 || toIdx === -1) return false;
  return toIdx > fromIdx;
}

/** Every status this sale could legally move to right now — powers both
 * the admin panel's status picker and the bulk-action bar's "only offer
 * statuses valid for every selected order" filtering. */
export function nextValidStatuses(current: OrderStatus): OrderStatus[] {
  const all = [...ORDER_STATUS_SEQUENCE, ...TERMINAL_ORDER_STATUSES];
  return all.filter((s) => isValidStatusTransition(current, s));
}

export interface RestockDraw {
  productId: string;
  productName: string;
  variantId: string | null;
  variantLabel: string | null;
  amount: number;
  kind: "attar" | "imported";
  note: string;
}

/**
 * Computes exactly what a cancel/return would restore, one draw per
 * ORIGINAL source line (a direct line and a combo component stay separate
 * even when they share a productId+variantId, mirroring recordSale's own
 * per-source movementDraws so the audit trail stays as itemized as the
 * original deduction was). Pure function of the sale's own already-known
 * items — safe to run client-side for the confirmation dialog's preview
 * ("this will restore exactly this"), and reused verbatim server-side
 * inside the actual transaction, so the preview can never drift from what
 * really happens.
 */
export function computeRestockDraws(
  sale: { invoiceNo: string; items: SaleItem[] },
  targetStatus: "cancelled" | "returned",
): RestockDraw[] {
  const verb = targetStatus === "cancelled" ? "cancelled" : "returned";
  const draws: RestockDraw[] = [];

  for (const item of sale.items) {
    if (item.comboComponents && item.comboComponents.length > 0) {
      for (const c of item.comboComponents) {
        const isImported = c.productType === "imported";
        const amount = isImported ? c.qty : c.oilMlUsed;
        if (amount <= 0) continue;
        draws.push({
          productId: c.productId,
          productName: c.productName,
          variantId: isImported ? null : c.variantId,
          variantLabel: c.variantLabel,
          amount,
          kind: isImported ? "imported" : "attar",
          note: `Order ${sale.invoiceNo} ${verb} — Combo: ${item.comboTitle ?? item.productName}`,
        });
      }
      continue;
    }
    const isImported = item.productType === "imported";
    const amount = isImported ? item.qty : (item.oilMlUsed ?? 0);
    if (amount <= 0) continue;
    draws.push({
      productId: item.productId,
      productName: item.productName,
      variantId: isImported ? null : item.variantId,
      variantLabel: isImported ? (item.sizeLabel ?? null) : null,
      amount,
      kind: isImported ? "imported" : "attar",
      note: `Order ${sale.invoiceNo} ${verb}`,
    });
  }

  return draws;
}

/** Aggregated per-product totals for a clean confirmation-dialog summary
 * ("This will restore: 12ml to Adidas, 1 unit to XYZ") — the underlying
 * restock still writes one movement per fine-grained draw above; this is
 * purely a display rollup. */
export function summarizeRestockDraws(
  draws: RestockDraw[],
): { productName: string; amount: number; kind: "attar" | "imported" }[] {
  const byProduct = new Map<string, { productName: string; amount: number; kind: "attar" | "imported" }>();
  for (const draw of draws) {
    const existing = byProduct.get(draw.productId);
    if (existing) existing.amount += draw.amount;
    else byProduct.set(draw.productId, { productName: draw.productName, amount: draw.amount, kind: draw.kind });
  }
  return [...byProduct.values()];
}

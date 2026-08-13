"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Gift, MessageCircle, Package, Printer, Truck, User } from "lucide-react";
import { Modal } from "@/components/admin/modal";
import { adminFetch } from "@/lib/admin/apiClient";
import { itemVariantLabel, saleHasCombo, saleHasGift } from "@/lib/admin/salesAggregation";
import { useCustomerDoc } from "@/lib/admin/useCustomerDoc";
import { useNotificationSettings } from "@/lib/admin/useNotificationSettings";
import {
  computeRestockDraws,
  normalizeOrderStatus,
  nextValidStatuses,
  ORDER_STATUS_LABELS,
  summarizeRestockDraws,
  TERMINAL_ORDER_STATUSES,
} from "@/lib/orderFulfillment";
import { formatInr } from "@/lib/pricing";
import { buildCustomerWhatsAppUrl, buildStatusUpdateMessage } from "@/lib/whatsapp";
import type { OrderStatus, Sale } from "@/lib/firestore/types";

const inputClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 outline-none focus:border-amber-400";

function StatusHistoryTimeline({ sale }: { sale: Sale }) {
  // Sales recorded before statusHistory existed have none at all — synthesize
  // a single entry from what we do know (display only, never written back)
  // rather than showing an empty/confusing timeline.
  const history =
    sale.statusHistory && sale.statusHistory.length > 0
      ? sale.statusHistory
      : [
          {
            status: normalizeOrderStatus(sale.orderStatus),
            timestamp: sale.createdAt,
            changedByUid: sale.createdByUid,
            changedByName: null,
            note: "Historical — recorded before status tracking began",
          },
        ];

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
      <p className="mb-2 text-xs text-zinc-500 uppercase">Status history</p>
      <ol className="flex flex-col gap-2.5">
        {history.map((entry, idx) => (
          <li key={idx} className="flex items-start gap-2.5 text-sm">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-400" />
            <div>
              <p className="text-zinc-50">
                {ORDER_STATUS_LABELS[entry.status]}
                <span className="ml-2 text-xs text-zinc-500">
                  {entry.timestamp.toDate().toLocaleString("en-IN")}
                </span>
              </p>
              <p className="text-xs text-zinc-500">
                by {entry.changedByName || entry.changedByUid}
              </p>
              {entry.note && <p className="mt-0.5 text-xs text-zinc-400 italic">{entry.note}</p>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ShippingForm({ sale, onSaved }: { sale: Sale; onSaved: () => void }) {
  const s = sale.shipping;
  const [courierName, setCourierName] = useState(s?.courierName ?? "");
  const [trackingNumber, setTrackingNumber] = useState(s?.trackingNumber ?? "");
  const [trackingUrl, setTrackingUrl] = useState(s?.trackingUrl ?? "");
  const [dispatchDate, setDispatchDate] = useState(
    s?.dispatchDate ? s.dispatchDate.toDate().toISOString().slice(0, 10) : "",
  );
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(
    s?.expectedDeliveryDate ? s.expectedDeliveryDate.toDate().toISOString().slice(0, 10) : "",
  );
  const [deliveryNotes, setDeliveryNotes] = useState(s?.deliveryNotes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSubmitting(true);
    setError(null);
    setSaved(false);
    try {
      await adminFetch(`/api/admin/sales/${sale.id}/shipping`, {
        method: "PATCH",
        body: JSON.stringify({
          courierName: courierName.trim() || null,
          trackingNumber: trackingNumber.trim() || null,
          trackingUrl: trackingUrl.trim() || null,
          dispatchDate: dispatchDate || null,
          expectedDeliveryDate: expectedDeliveryDate || null,
          deliveryNotes: deliveryNotes.trim() || null,
        }),
      });
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs text-zinc-500 uppercase">
        <Truck size={12} />
        Courier &amp; tracking
      </p>
      <div className="grid grid-cols-2 gap-2">
        <input
          className={inputClass}
          placeholder="Courier name"
          value={courierName}
          onChange={(e) => setCourierName(e.target.value)}
        />
        <input
          className={inputClass}
          placeholder="Tracking number"
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
        />
        <input
          className={`${inputClass} col-span-2`}
          placeholder="Tracking URL"
          value={trackingUrl}
          onChange={(e) => setTrackingUrl(e.target.value)}
        />
        <div>
          <label className="mb-1 block text-[11px] text-zinc-500">Dispatch date</label>
          <input
            type="date"
            className={inputClass}
            value={dispatchDate}
            onChange={(e) => setDispatchDate(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-zinc-500">Expected delivery</label>
          <input
            type="date"
            className={inputClass}
            value={expectedDeliveryDate}
            onChange={(e) => setExpectedDeliveryDate(e.target.value)}
          />
        </div>
        <textarea
          className={`${inputClass} col-span-2`}
          placeholder="Delivery notes"
          rows={2}
          value={deliveryNotes}
          onChange={(e) => setDeliveryNotes(e.target.value)}
        />
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      {saved && !error && <p className="mt-2 text-xs text-green-400">Saved.</p>}
      <button
        type="button"
        onClick={handleSave}
        disabled={submitting}
        className="mt-2 cursor-pointer rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-700 disabled:opacity-40"
      >
        {submitting ? "Saving…" : "Save shipping details"}
      </button>
    </div>
  );
}

function MarkPaidButton({ sale }: { sale: Sale }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (sale.paymentMethod !== "cod" || sale.paymentStatus !== "pending") return null;

  async function handleClick() {
    setSubmitting(true);
    setError(null);
    try {
      await adminFetch(`/api/admin/sales/${sale.id}/mark-paid`, { method: "POST" });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-1 flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={submitting}
        className="cursor-pointer rounded-lg bg-green-500/15 px-3 py-1 text-xs font-semibold text-green-300 hover:bg-green-500/25 disabled:opacity-40"
      >
        {submitting ? "Saving…" : "Mark as paid"}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {saved && !error && <p className="text-xs text-green-400">Marked paid.</p>}
    </div>
  );
}

function RefundForm({ sale }: { sale: Sale }) {
  const existing = sale.refund;
  const currentStatus = normalizeOrderStatus(sale.orderStatus);
  const alreadyTerminal = TERMINAL_ORDER_STATUSES.includes(currentStatus);

  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"pending" | "completed">(existing?.status ?? "completed");
  const [amountInr, setAmountInr] = useState(String(existing?.amountInr ?? sale.total));
  const [reason, setReason] = useState(existing?.reason ?? "");
  const [restock, setRestock] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSaved(false);
    const amount = Number(amountInr);
    if (!amount || amount <= 0) {
      setError("Enter a valid refund amount.");
      return;
    }
    if (!reason.trim()) {
      setError("A reason is required.");
      return;
    }
    setSubmitting(true);
    try {
      await adminFetch(`/api/admin/sales/${sale.id}/refund`, {
        method: "POST",
        body: JSON.stringify({ status, amountInr: amount, reason: reason.trim(), restock }),
      });
      setSaved(true);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
      <p className="mb-2 text-xs text-zinc-500 uppercase">Refund</p>
      {existing && (
        <div className="mb-2 text-sm">
          <p className="text-zinc-50">
            {formatInr(existing.amountInr)} · {existing.status}
            {existing.restocked ? " · restocked" : ""}
          </p>
          <p className="text-zinc-400 italic">{existing.reason}</p>
          <p className="text-xs text-zinc-500">
            by {existing.recordedByName || existing.recordedByUid} ·{" "}
            {existing.recordedAt.toDate().toLocaleString("en-IN")}
          </p>
        </div>
      )}
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="cursor-pointer rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:text-zinc-50"
        >
          {existing ? "Update refund record" : "Record a refund"}
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "pending" | "completed")}
              className={inputClass}
            >
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
            </select>
            <input
              className={inputClass}
              type="number"
              min={1}
              max={sale.total}
              placeholder="Amount (₹)"
              value={amountInr}
              onChange={(e) => setAmountInr(e.target.value)}
            />
          </div>
          <input
            className={inputClass}
            placeholder="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <label className="flex items-center gap-2 text-xs text-zinc-300">
            <input
              type="checkbox"
              checked={restock}
              onChange={(e) => setRestock(e.target.checked)}
              disabled={alreadyTerminal}
            />
            Restore stock (marks order {currentStatus === "delivered" ? "returned" : "cancelled"})
          </label>
          {alreadyTerminal && (
            <p className="text-xs text-zinc-500">
              This order is already {ORDER_STATUS_LABELS[currentStatus].toLowerCase()} — stock was already
              restored by that.
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="cursor-pointer rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-400 disabled:opacity-40"
            >
              {submitting ? "Saving…" : "Save refund"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={submitting}
              className="cursor-pointer rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-zinc-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      {saved && !error && <p className="mt-2 text-xs text-green-400">Refund recorded.</p>}
    </div>
  );
}

export function SaleDetail({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  const currentStatus = normalizeOrderStatus(sale.orderStatus);
  const options = nextValidStatuses(currentStatus);
  const [nextStatus, setNextStatus] = useState<OrderStatus | "">("");
  const [note, setNote] = useState("");
  const [confirmingRestock, setConfirmingRestock] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const { customer: linkedCustomer } = useCustomerDoc(sale.customerUid);
  const { statusChangeWhatsAppEnabled } = useNotificationSettings();

  const giftItems = sale.items.filter((item) => item.isGift);
  const comboItems = sale.items.filter((item) => item.comboId);
  const isRestockingChoice = nextStatus === "cancelled" || nextStatus === "returned";

  async function commitStatusChange(target: OrderStatus) {
    setSubmitting(true);
    setError(null);
    try {
      await adminFetch(`/api/admin/sales/${sale.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ orderStatus: target, note: note.trim() || null }),
      });
      setSaved(true);
      setConfirmingRestock(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleUpdateClick() {
    if (!nextStatus) return;
    setError(null);
    setSaved(false);
    if (isRestockingChoice) {
      setConfirmingRestock(true);
      return;
    }
    void commitStatusChange(nextStatus);
  }

  const restockDraws = isRestockingChoice ? computeRestockDraws(sale, nextStatus as "cancelled" | "returned") : [];
  const restockSummary = summarizeRestockDraws(restockDraws);

  return (
    <Modal title={`Invoice ${sale.invoiceNo}`} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-zinc-500 uppercase">Customer</p>
            <p className="text-zinc-50">{sale.customerName}</p>
            <p className="text-zinc-400">{sale.customerPhone}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase">Date</p>
            <p className="text-zinc-50">
              {sale.createdAt.toDate().toLocaleString("en-IN")}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase">Channel</p>
            <p className="text-zinc-50 capitalize">{sale.channel}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase">Payment</p>
            <p className="text-zinc-50 capitalize">
              {sale.paymentMethod} · {sale.paymentStatus}
            </p>
            <MarkPaidButton sale={sale} />
          </div>
        </div>

        {sale.customerUid && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-sm">
            <p className="text-xs text-zinc-500 uppercase">Linked account</p>
            {linkedCustomer ? (
              <>
                <p className="mt-1 text-zinc-50">{linkedCustomer.name || "—"}</p>
                <p className="text-zinc-400">{linkedCustomer.email}</p>
                {linkedCustomer.phone && <p className="text-zinc-400">{linkedCustomer.phone}</p>}
              </>
            ) : (
              <p className="mt-1 text-zinc-500">Loading…</p>
            )}
            <Link
              href={`/admin/customers/${sale.customerUid}`}
              className="mt-2 inline-flex items-center gap-1.5 text-xs text-amber-400 underline underline-offset-2 hover:text-amber-300"
            >
              <User size={12} />
              View customer profile
            </Link>
          </div>
        )}

        {sale.deliveryAddress && (
          <div className="text-sm">
            <p className="text-xs text-zinc-500 uppercase">Delivery address</p>
            <p className="text-zinc-300">
              {sale.deliveryAddress.label} — {sale.deliveryAddress.fullName} · {sale.deliveryAddress.phone}
            </p>
            <p className="text-zinc-300">
              {sale.deliveryAddress.line1}
              {sale.deliveryAddress.line2 ? `, ${sale.deliveryAddress.line2}` : ""},{" "}
              {sale.deliveryAddress.city}, {sale.deliveryAddress.district}, {sale.deliveryAddress.state} —{" "}
              {sale.deliveryAddress.pincode}
            </p>
          </div>
        )}

        {sale.shippingAddress && (
          <div className="text-sm">
            <p className="text-xs text-zinc-500 uppercase">Shipping address</p>
            <p className="text-zinc-300">
              {sale.shippingAddress.line1}
              {sale.shippingAddress.line2 ? `, ${sale.shippingAddress.line2}` : ""},{" "}
              {sale.shippingAddress.city}, {sale.shippingAddress.state} —{" "}
              {sale.shippingAddress.pincode}
            </p>
          </div>
        )}

        <div className="rounded-lg border border-zinc-800">
          <ul className="divide-y divide-zinc-800">
            {sale.items.map((item, idx) => (
              <li
                key={`${item.productId}-${item.variantId}-${idx}`}
                className="flex justify-between gap-3 px-3 py-2.5 text-sm"
              >
                <div>
                  <p className="flex items-center gap-1.5 text-zinc-50">
                    {item.comboId && <Package size={13} className="text-sky-400" />}
                    {item.productName}
                    {item.isGift && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-amber-400 uppercase">
                        <Gift size={10} />
                        Gift
                      </span>
                    )}
                  </p>
                  {item.comboComponents && item.comboComponents.length > 0 ? (
                    <p className="text-zinc-500">
                      {item.comboComponents
                        .map((c) => `${c.variantLabel}${c.qty > 1 ? ` ×${c.qty}` : ""}`)
                        .join(", ")}{" "}
                      × {item.qty}
                    </p>
                  ) : (
                    <p className="text-zinc-500">
                      {itemVariantLabel(item)} × {item.qty}
                    </p>
                  )}
                </div>
                <p className="shrink-0 font-medium text-zinc-50">
                  {formatInr(item.lineTotal)}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between text-zinc-400">
            <span>Subtotal</span>
            <span>{formatInr(sale.subtotal)}</span>
          </div>
          {sale.discount > 0 && (
            <div className="flex justify-between text-zinc-400">
              <span>Discount</span>
              <span>-{formatInr(sale.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-semibold text-zinc-50">
            <span>Total</span>
            <span>{formatInr(sale.total)}</span>
          </div>
        </div>

        {saleHasCombo(sale) && (
          <div className="rounded-lg border-l-4 border-sky-400 bg-sky-400/5 p-4">
            <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-sky-400 uppercase">
              <Package size={13} />
              Combo details
            </p>
            <div className="flex flex-col gap-3">
              {comboItems.map((item, idx) => (
                <div key={`${item.comboId}-${idx}`} className="text-sm">
                  <p className="font-medium text-zinc-50">
                    {item.comboTitle} × {item.qty}
                  </p>
                  <ul className="mt-1 text-zinc-400">
                    {(item.comboComponents ?? []).map((c, cIdx) => (
                      <li key={`${c.productId}-${c.variantId}-${cIdx}`}>
                        {c.productName} — {c.variantLabel}
                        {c.qty > 1 ? ` ×${c.qty}` : ""} ({c.oilMlUsed}ml oil)
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {saleHasGift(sale) && (
          <div className="rounded-lg border-l-4 border-amber-400 bg-amber-400/5 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-amber-400 uppercase">
                <Gift size={13} />
                Gift details
              </p>
              <Link
                href={`/admin/sales/${sale.id}/gift-card`}
                target="_blank"
                className="flex cursor-pointer items-center gap-1.5 text-xs text-zinc-300 underline underline-offset-2 hover:text-amber-400"
              >
                <Printer size={12} />
                Print gift card
              </Link>
            </div>

            <div className="flex flex-col gap-3">
              {giftItems.map((item, idx) => (
                <div key={`${item.variantId}-${idx}`} className="text-sm">
                  <p className="font-medium text-zinc-50">
                    {item.productName} — {itemVariantLabel(item)}
                  </p>
                  <p className="text-zinc-400">
                    For <span className="text-zinc-200">{item.giftRecipientName || "—"}</span>
                    {item.giftSenderName ? ` · From ${item.giftSenderName}` : ""}
                  </p>
                  {item.giftMessage && (
                    <p className="mt-1 rounded-md bg-zinc-900 p-2 text-zinc-300 italic">
                      &ldquo;{item.giftMessage}&rdquo;
                    </p>
                  )}
                  <p className="mt-1 text-xs text-zinc-500">
                    {item.giftWrap ? "Gift wrap requested" : "No gift wrap"}
                  </p>
                </div>
              ))}

              <div className="border-t border-amber-400/20 pt-3 text-sm">
                <p className="text-zinc-400">
                  {sale.hidePrices
                    ? "Hide prices in the package: yes"
                    : "Hide prices in the package: no"}
                </p>
                {sale.giftShippingAddress && (
                  <div className="mt-2">
                    <p className="text-xs text-zinc-500 uppercase">
                      Gift delivery address
                    </p>
                    <p className="text-zinc-300">
                      {sale.giftShippingAddress.name} ·{" "}
                      {sale.giftShippingAddress.phone}
                    </p>
                    <p className="text-zinc-300">
                      {sale.giftShippingAddress.line1}
                      {sale.giftShippingAddress.line2
                        ? `, ${sale.giftShippingAddress.line2}`
                        : ""}
                      , {sale.giftShippingAddress.city}, {sale.giftShippingAddress.state}{" "}
                      — {sale.giftShippingAddress.pincode}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <Link
          href={`/admin/sales/${sale.id}/packing-slip`}
          target="_blank"
          className="flex w-fit cursor-pointer items-center gap-1.5 text-xs text-zinc-300 underline underline-offset-2 hover:text-amber-400"
        >
          <Printer size={12} />
          Print packing slip
        </Link>

        <StatusHistoryTimeline sale={sale} />

        {sale.channel === "online" && <ShippingForm sale={sale} onSaved={() => {}} />}

        <RefundForm sale={sale} />

        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
          <p className="mb-2 text-xs text-zinc-500 uppercase">Update status</p>
          {TERMINAL_ORDER_STATUSES.includes(currentStatus) ? (
            <p className="text-sm text-zinc-500">
              This order is {ORDER_STATUS_LABELS[currentStatus].toLowerCase()} — no further status
              changes are possible.
            </p>
          ) : options.length === 0 ? (
            <p className="text-sm text-zinc-500">No further status changes are possible.</p>
          ) : confirmingRestock ? (
            <div className="rounded-lg border border-red-400/30 bg-red-400/5 p-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-red-300">
                <AlertTriangle size={14} />
                Confirm: mark as {ORDER_STATUS_LABELS[nextStatus as OrderStatus]}
              </p>
              {restockSummary.length > 0 ? (
                <>
                  <p className="mt-2 text-xs text-zinc-400">This will restore to stock:</p>
                  <ul className="mt-1 flex flex-col gap-0.5 text-sm text-zinc-200">
                    {restockSummary.map((r) => (
                      <li key={r.productName}>
                        {r.productName}: +{r.amount} {r.kind === "imported" ? "unit(s)" : "ml"}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="mt-2 text-xs text-zinc-400">
                  This order has nothing to restock (all lines already at 0).
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => commitStatusChange(nextStatus as OrderStatus)}
                  disabled={submitting}
                  className="cursor-pointer rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-400 disabled:opacity-40"
                >
                  {submitting ? "Working…" : `Yes, mark as ${ORDER_STATUS_LABELS[nextStatus as OrderStatus]}`}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingRestock(false)}
                  disabled={submitting}
                  className="cursor-pointer rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-zinc-50"
                >
                  Back
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <select
                  value={nextStatus}
                  onChange={(e) => {
                    setNextStatus(e.target.value as OrderStatus);
                    setSaved(false);
                  }}
                  className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 outline-none focus:border-amber-400"
                >
                  <option value="">Select next status…</option>
                  {options.map((opt) => (
                    <option key={opt} value={opt}>
                      {ORDER_STATUS_LABELS[opt]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleUpdateClick}
                  disabled={submitting || !nextStatus}
                  className="cursor-pointer rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-300 disabled:opacity-40"
                >
                  {submitting ? "Saving…" : "Update"}
                </button>
              </div>
              <input
                className={`${inputClass} mt-2`}
                placeholder="Note (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </>
          )}
          {saved && !confirmingRestock && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="text-xs text-green-400">Status updated.</p>
              {statusChangeWhatsAppEnabled && nextStatus && (() => {
                const message = buildStatusUpdateMessage({
                  customerName: sale.customerName,
                  invoiceNo: sale.invoiceNo,
                  status: nextStatus as OrderStatus,
                  courierName: sale.shipping?.courierName,
                  trackingNumber: sale.shipping?.trackingNumber,
                  trackingUrl: sale.shipping?.trackingUrl,
                });
                const url = buildCustomerWhatsAppUrl(sale.customerPhone, message);
                if (!url) return null;
                return (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-green-500/15 px-3 py-1.5 text-xs font-semibold text-green-300 hover:bg-green-500/25"
                  >
                    <MessageCircle size={13} />
                    Notify customer via WhatsApp
                  </a>
                );
              })()}
            </div>
          )}
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        </div>
      </div>
    </Modal>
  );
}

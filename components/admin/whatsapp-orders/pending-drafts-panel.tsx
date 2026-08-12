"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Clock, User } from "lucide-react";
import { usePendingWhatsAppDrafts } from "@/lib/admin/usePendingWhatsAppDrafts";
import { useActiveProducts } from "@/lib/pos/useActiveProducts";
import { useActiveCombos } from "@/lib/pos/useActiveCombos";
import { livePriceForVariant } from "@/lib/products";
import { formatInr, formatVariantLabel } from "@/lib/pricing";
import { adminFetch } from "@/lib/admin/apiClient";
import { Modal } from "@/components/admin/modal";
import type { Combo, PendingOrder, Product } from "@/lib/firestore/types";

function itemDisplay(
  item: PendingOrder["items"][number],
  productsById: Map<string, Product>,
  combosById: Map<string, Combo>,
): { name: string; detail: string; lineTotal: number } {
  if (item.kind === "combo") {
    const combo = combosById.get(item.comboId);
    return {
      name: combo?.title ?? "Combo (no longer available)",
      detail: `× ${item.qty}`,
      lineTotal: (combo?.comboPriceInr ?? 0) * item.qty,
    };
  }
  const product = productsById.get(item.productId);
  if (!product) return { name: "Product no longer available", detail: `× ${item.qty}`, lineTotal: 0 };
  const price = livePriceForVariant(product, item.variantId) ?? 0;
  const variantLabel =
    product.productType === "imported"
      ? product.sizeLabel
      : (() => {
          const v = product.variants.find((v) => v.variantId === item.variantId);
          return v ? formatVariantLabel(v.type, v.sizeMl) : item.variantId;
        })();
  return { name: product.name, detail: `${variantLabel} × ${item.qty}`, lineTotal: price * item.qty };
}

function timeUntil(expiresAt: Date): string {
  const ms = expiresAt.getTime() - Date.now();
  if (ms <= 0) return "expired";
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days >= 1) return `${days}d left`;
  const hours = Math.floor(ms / (1000 * 60 * 60));
  return `${Math.max(hours, 1)}h left`;
}

function DraftDetail({
  draft,
  productsById,
  combosById,
  onClose,
  onConverted,
}: {
  draft: PendingOrder;
  productsById: Map<string, Product>;
  combosById: Map<string, Combo>;
  onClose: () => void;
  onConverted: (invoiceNo: string) => void;
}) {
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "card">("cash");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lines = draft.items.map((item) => itemDisplay(item, productsById, combosById));
  const total = lines.reduce((sum, l) => sum + l.lineTotal, 0);

  async function handleConvert() {
    setSubmitting(true);
    setError(null);
    try {
      const data = await adminFetch<{ invoiceNo: string }>(`/api/admin/whatsapp-orders/${draft.id}/convert`, {
        method: "POST",
        body: JSON.stringify({ paymentMethod }),
      });
      onConverted(data.invoiceNo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Draft ${draft.referenceCode ?? draft.id}`} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-zinc-500 uppercase">Customer</p>
            <p className="text-zinc-50">{draft.customerName}</p>
            <p className="text-zinc-400">{draft.customerPhone}</p>
            {draft.customerUid && (
              <Link
                href={`/admin/customers/${draft.customerUid}`}
                className="mt-1 inline-flex items-center gap-1 text-xs text-amber-400 underline underline-offset-2 hover:text-amber-300"
              >
                <User size={11} />
                View profile
              </Link>
            )}
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase">Created</p>
            <p className="text-zinc-50">{draft.createdAt.toDate().toLocaleString("en-IN")}</p>
            {draft.expiresAt && (
              <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                <Clock size={11} />
                {timeUntil(draft.expiresAt.toDate())}
              </p>
            )}
          </div>
        </div>

        {draft.deliveryAddress && (
          <div className="text-sm">
            <p className="text-xs text-zinc-500 uppercase">Delivery address</p>
            <p className="text-zinc-300">
              {draft.deliveryAddress.label} — {draft.deliveryAddress.fullName}
            </p>
            <p className="text-zinc-300">
              {draft.deliveryAddress.line1}
              {draft.deliveryAddress.line2 ? `, ${draft.deliveryAddress.line2}` : ""},{" "}
              {draft.deliveryAddress.city}, {draft.deliveryAddress.district}, {draft.deliveryAddress.state} —{" "}
              {draft.deliveryAddress.pincode}
            </p>
          </div>
        )}

        <div className="rounded-lg border border-zinc-800">
          <ul className="divide-y divide-zinc-800">
            {lines.map((line, idx) => (
              <li key={idx} className="flex justify-between gap-3 px-3 py-2.5 text-sm">
                <div>
                  <p className="text-zinc-50">{line.name}</p>
                  <p className="text-zinc-500">{line.detail}</p>
                </div>
                <p className="shrink-0 font-medium text-zinc-50">{formatInr(line.lineTotal)}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-between text-base font-semibold text-zinc-50">
          <span>Total</span>
          <span>{formatInr(total)}</span>
        </div>

        <div>
          <p className="mb-2 text-xs text-zinc-500 uppercase">Payment method</p>
          <div className="flex gap-2">
            {(["cash", "upi", "card"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPaymentMethod(m)}
                className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-sm capitalize transition-colors ${
                  paymentMethod === m
                    ? "border-amber-400 bg-amber-400/10 text-amber-400"
                    : "border-zinc-800 text-zinc-300 hover:border-zinc-700"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="button"
          onClick={handleConvert}
          disabled={submitting}
          className="cursor-pointer rounded-lg bg-amber-400 px-4 py-3 text-sm font-semibold text-zinc-950 hover:bg-amber-300 disabled:opacity-40"
        >
          {submitting ? "Converting…" : "Convert to sale"}
        </button>
      </div>
    </Modal>
  );
}

/** Open (non-expired) WhatsApp drafts created by signed-in customers tapping
 * "Order on WhatsApp" (see app/api/account/whatsapp-order/route.ts) —
 * separate from the manual re-key screen below it, for the ONE-CLICK
 * "review, then convert" flow this doesn't need re-entry for. Renders
 * nothing at all when there are no open drafts. */
export function PendingDraftsPanel() {
  const { drafts, loading } = usePendingWhatsAppDrafts();
  const { products } = useActiveProducts();
  const { combos } = useActiveCombos();
  const [selected, setSelected] = useState<PendingOrder | null>(null);
  const [converted, setConverted] = useState<string | null>(null);

  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const combosById = useMemo(() => new Map(combos.map((c) => [c.id, c])), [combos]);

  if (loading || drafts.length === 0) return null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <p className="mb-3 text-sm font-semibold text-zinc-50">
        Pending WhatsApp orders <span className="text-zinc-500">({drafts.length})</span>
      </p>
      <div className="flex flex-col gap-2">
        {drafts.map((draft) => {
          const itemCount = draft.items.reduce((n, i) => n + i.qty, 0);
          return (
            <button
              key={draft.id}
              type="button"
              onClick={() => setSelected(draft)}
              className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-left transition-colors hover:border-amber-400/40"
            >
              <div>
                <p className="text-sm font-medium text-zinc-50">
                  {draft.referenceCode} · {draft.customerName}
                </p>
                <p className="text-xs text-zinc-500">
                  {itemCount} item{itemCount === 1 ? "" : "s"} ·{" "}
                  {draft.expiresAt ? timeUntil(draft.expiresAt.toDate()) : ""}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-zinc-50">{formatInr(draft.amountPaise / 100)}</p>
            </button>
          );
        })}
      </div>

      {selected && (
        <DraftDetail
          draft={selected}
          productsById={productsById}
          combosById={combosById}
          onClose={() => setSelected(null)}
          onConverted={(invoiceNo) => {
            setSelected(null);
            setConverted(invoiceNo);
          }}
        />
      )}

      {converted && (
        <Modal title="Order recorded" onClose={() => setConverted(null)}>
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <p className="text-sm text-zinc-400">Invoice number</p>
            <p className="text-2xl font-bold tracking-widest text-amber-400">{converted}</p>
            <p className="text-sm text-zinc-500">Stock has been deducted, same as any other sale.</p>
          </div>
        </Modal>
      )}
    </div>
  );
}

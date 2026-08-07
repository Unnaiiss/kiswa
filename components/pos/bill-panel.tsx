"use client";

import { Gift, Loader2, Minus, Package, Plus, ShoppingBag, Trash2 } from "lucide-react";
import type { BillLine, DiscountMode, PosPaymentMethod } from "@/lib/pos/types";
import { formatInr, formatVariantLabel } from "@/lib/pricing";

interface BillPanelProps {
  lines: BillLine[];
  onIncrement: (productId: string, variantId: string) => void;
  onDecrement: (productId: string, variantId: string) => void;
  onRemove: (productId: string, variantId: string) => void;
  onToggleGiftWrap: (productId: string, variantId: string) => void;

  customerName: string;
  onCustomerNameChange: (value: string) => void;
  customerPhone: string;
  onCustomerPhoneChange: (value: string) => void;

  discountMode: DiscountMode;
  onDiscountModeChange: (mode: DiscountMode) => void;
  discountValue: number;
  onDiscountValueChange: (value: number) => void;

  paymentMethod: PosPaymentMethod;
  onPaymentMethodChange: (method: PosPaymentMethod) => void;

  subtotal: number;
  discountAmount: number;
  total: number;

  submitting: boolean;
  error: string | null;
  onCompleteBill: () => void;
}

const PAYMENT_OPTIONS: { value: PosPaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
];

const inputClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-amber-400";

export function BillPanel(props: BillPanelProps) {
  const {
    lines,
    onIncrement,
    onDecrement,
    onRemove,
    onToggleGiftWrap,
    customerName,
    onCustomerNameChange,
    customerPhone,
    onCustomerPhoneChange,
    discountMode,
    onDiscountModeChange,
    discountValue,
    onDiscountValueChange,
    paymentMethod,
    onPaymentMethodChange,
    subtotal,
    discountAmount,
    total,
    submitting,
    error,
    onCompleteBill,
  } = props;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        {lines.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-zinc-500">
            <ShoppingBag size={32} />
            <p>Tap a fragrance to start the bill.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {lines.map((line) => (
              <li
                key={`${line.productId}-${line.variantId}`}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="flex items-center gap-1.5 font-medium text-zinc-50">
                      {line.combo && <Package size={13} className="text-amber-400" />}
                      {line.productName}
                    </p>
                    {line.combo ? (
                      <p className="text-xs text-zinc-500">
                        {line.combo.components.map((c) => `${c.variantLabel}${c.qty > 1 ? ` ×${c.qty}` : ""}`).join(", ")}
                        {" · "}
                        {formatInr(line.unitPrice)} each
                      </p>
                    ) : (
                      <p className="text-xs text-zinc-500">
                        {line.sizeLabel ?? formatVariantLabel(line.type, line.sizeMl)} ·{" "}
                        {formatInr(line.unitPrice)} each
                      </p>
                    )}
                    {line.giftWrap && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-400 uppercase">
                        <Gift size={10} />
                        Gift wrapped
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {!line.combo && (
                      <button
                        type="button"
                        aria-label={line.giftWrap ? "Remove gift wrap" : "Mark as gift wrap"}
                        onClick={() => onToggleGiftWrap(line.productId, line.variantId)}
                        className={`cursor-pointer p-1 ${
                          line.giftWrap
                            ? "text-amber-400"
                            : "text-zinc-500 hover:text-amber-400"
                        }`}
                      >
                        <Gift size={16} />
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label="Remove item"
                      onClick={() => onRemove(line.productId, line.variantId)}
                      className="cursor-pointer p-1 text-zinc-500 hover:text-red-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center rounded-full border border-zinc-700">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      onClick={() => onDecrement(line.productId, line.variantId)}
                      className="flex size-10 cursor-pointer items-center justify-center text-zinc-300 hover:text-amber-400"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="min-w-[2rem] text-center text-base font-semibold text-zinc-50">
                      {line.qty}
                    </span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      onClick={() => onIncrement(line.productId, line.variantId)}
                      className="flex size-10 cursor-pointer items-center justify-center text-zinc-300 hover:text-amber-400"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <p className="text-base font-semibold text-zinc-50">
                    {formatInr(line.unitPrice * line.qty)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="shrink-0 border-t border-zinc-800 p-4">
        <div className="mb-3 grid grid-cols-2 gap-2">
          <input
            value={customerName}
            onChange={(e) => onCustomerNameChange(e.target.value)}
            placeholder="Customer name (optional)"
            className={inputClass}
          />
          <input
            value={customerPhone}
            onChange={(e) =>
              onCustomerPhoneChange(e.target.value.replace(/\D/g, "").slice(0, 10))
            }
            placeholder="Phone (optional)"
            inputMode="numeric"
            className={inputClass}
          />
        </div>

        <div className="mb-3 flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-zinc-800">
            <button
              type="button"
              onClick={() => onDiscountModeChange("flat")}
              className={`cursor-pointer px-3 py-2.5 text-sm font-semibold ${
                discountMode === "flat"
                  ? "bg-amber-400 text-zinc-950"
                  : "bg-zinc-900 text-zinc-400"
              }`}
            >
              ₹
            </button>
            <button
              type="button"
              onClick={() => onDiscountModeChange("percent")}
              className={`cursor-pointer px-3 py-2.5 text-sm font-semibold ${
                discountMode === "percent"
                  ? "bg-amber-400 text-zinc-950"
                  : "bg-zinc-900 text-zinc-400"
              }`}
            >
              %
            </button>
          </div>
          <input
            value={discountValue || ""}
            onChange={(e) => onDiscountValueChange(Number(e.target.value) || 0)}
            placeholder="Discount"
            inputMode="decimal"
            className={`${inputClass} flex-1`}
          />
        </div>

        <div className="mb-3 grid grid-cols-3 gap-2">
          {PAYMENT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onPaymentMethodChange(opt.value)}
              className={`cursor-pointer rounded-lg border py-3 text-sm font-semibold transition-colors ${
                paymentMethod === opt.value
                  ? "border-amber-400 bg-amber-400/10 text-amber-400"
                  : "border-zinc-800 bg-zinc-900 text-zinc-400"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="mb-3 flex flex-col gap-1 text-sm">
          <div className="flex justify-between text-zinc-400">
            <span>Subtotal</span>
            <span>{formatInr(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-zinc-400">
              <span>Discount</span>
              <span>-{formatInr(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-semibold text-zinc-50">
            <span>Total</span>
            <span className="text-amber-400">{formatInr(total)}</span>
          </div>
        </div>

        {error && (
          <p className="mb-3 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={lines.length === 0 || submitting}
          onClick={onCompleteBill}
          className="flex h-16 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-amber-400 text-lg font-bold text-zinc-950 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting && <Loader2 size={20} className="animate-spin" />}
          {submitting ? "Completing…" : `Complete Bill · ${formatInr(total)}`}
        </button>
      </div>
    </div>
  );
}

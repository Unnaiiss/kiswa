"use client";

import { CheckCircle2, MessageCircle, Printer, Sparkles } from "lucide-react";
import type { ReceiptData } from "@/lib/pos/types";
import { formatInr, formatVariantLabel } from "@/lib/pricing";

interface ReceiptScreenProps {
  receipt: ReceiptData;
  onNewSale: () => void;
}

const PAYMENT_LABEL: Record<ReceiptData["paymentMethod"], string> = {
  cash: "Cash",
  upi: "UPI",
  card: "Card",
};

function formatDateTime(date: Date): string {
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function itemVariantText(item: ReceiptData["items"][number]): string {
  return item.combo
    ? item.combo.components.map((c) => `${c.variantLabel}${c.qty > 1 ? ` x${c.qty}` : ""}`).join(", ")
    : formatVariantLabel(item.type, item.sizeMl);
}

function buildWhatsAppMessage(receipt: ReceiptData): string {
  const lines = receipt.items.map(
    (item) =>
      `${item.productName} (${itemVariantText(item)}) x${item.qty} - ${formatInr(item.unitPrice * item.qty)}`,
  );
  return [
    `KISWA — Invoice ${receipt.invoiceNo}`,
    "",
    ...lines,
    "",
    `Subtotal: ${formatInr(receipt.subtotal)}`,
    ...(receipt.discount > 0 ? [`Discount: -${formatInr(receipt.discount)}`] : []),
    `Total: ${formatInr(receipt.total)}`,
    `Payment: ${PAYMENT_LABEL[receipt.paymentMethod]}`,
    "",
    "Thank you for shopping with KISWA!",
  ].join("\n");
}

export function ReceiptScreen({ receipt, onNewSale }: ReceiptScreenProps) {
  const validPhone = /^[6-9]\d{9}$/.test(receipt.customerPhone);

  function handlePrint() {
    window.print();
  }

  function handleWhatsApp() {
    const message = buildWhatsAppMessage(receipt);
    window.open(
      `https://wa.me/91${receipt.customerPhone}?text=${encodeURIComponent(message)}`,
      "_blank",
    );
  }

  return (
    <main className="flex min-h-dvh flex-col items-center bg-zinc-950 px-4 py-8 text-zinc-50">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-2 text-center print:hidden">
          <CheckCircle2 className="text-green-500" size={44} />
          <h1 className="text-2xl font-semibold">Bill completed</h1>
          <p className="text-sm text-zinc-500">Invoice number</p>
          <p className="text-3xl font-bold tracking-widest text-amber-400">
            {receipt.invoiceNo}
          </p>
        </div>

        <div
          id="pos-receipt"
          className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5 text-sm"
        >
          <div className="text-center">
            <p className="text-lg font-bold tracking-widest">KISWA</p>
            <p className="text-xs text-zinc-500">Attar &amp; Perfume</p>
          </div>
          <div className="my-3 border-t border-dashed border-zinc-700" />
          <div className="flex justify-between text-xs text-zinc-400">
            <span>Invoice: {receipt.invoiceNo}</span>
            <span>{formatDateTime(receipt.completedAt)}</span>
          </div>
          {(receipt.customerName || receipt.customerPhone) && (
            <p className="mt-1 text-xs text-zinc-400">
              {receipt.customerName || "Walk-in Customer"}
              {receipt.customerPhone ? ` · ${receipt.customerPhone}` : ""}
            </p>
          )}
          <div className="my-3 border-t border-dashed border-zinc-700" />
          <ul className="flex flex-col gap-1.5">
            {receipt.items.map((item) => (
              <li
                key={`${item.productId}-${item.variantId}`}
                className="flex justify-between gap-3"
              >
                <span>
                  {item.productName}
                  <span className="text-zinc-500">
                    {" "}
                    ({itemVariantText(item)}) x{item.qty}
                  </span>
                </span>
                <span className="shrink-0">
                  {formatInr(item.unitPrice * item.qty)}
                </span>
              </li>
            ))}
          </ul>
          <div className="my-3 border-t border-dashed border-zinc-700" />
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-zinc-400">
              <span>Subtotal</span>
              <span>{formatInr(receipt.subtotal)}</span>
            </div>
            {receipt.discount > 0 && (
              <div className="flex justify-between text-zinc-400">
                <span>Discount</span>
                <span>-{formatInr(receipt.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span>{formatInr(receipt.total)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Payment</span>
              <span>{PAYMENT_LABEL[receipt.paymentMethod]}</span>
            </div>
          </div>
          <div className="my-3 border-t border-dashed border-zinc-700" />
          <p className="text-center text-xs">
            Thank you for shopping with KISWA!
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 print:hidden">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 font-semibold text-zinc-50 hover:border-amber-400"
            >
              <Printer size={18} />
              Print
            </button>
            <button
              type="button"
              onClick={handleWhatsApp}
              disabled={!validPhone}
              title={validPhone ? undefined : "Enter a customer phone number to enable this"}
              className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 font-semibold text-zinc-50 hover:border-green-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <MessageCircle size={18} />
              WhatsApp
            </button>
          </div>
          <button
            type="button"
            onClick={onNewSale}
            className="flex h-16 cursor-pointer items-center justify-center gap-2 rounded-xl bg-amber-400 text-lg font-bold text-zinc-950 hover:bg-amber-300"
          >
            <Sparkles size={20} />
            New Sale
          </button>
        </div>
      </div>
    </main>
  );
}

"use client";

import { Gift, Printer } from "lucide-react";
import type { SaleItem } from "@/lib/firestore/types";

export function GiftCardView({
  invoiceNo,
  giftItems,
}: {
  invoiceNo: string;
  giftItems: SaleItem[];
}) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-6 px-4 py-10">
      <div className="flex items-center gap-2 text-zinc-400 print:hidden">
        <p className="text-sm">Invoice {invoiceNo}</p>
      </div>

      <button
        type="button"
        onClick={() => window.print()}
        className="flex cursor-pointer items-center gap-2 rounded-lg bg-amber-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-300 print:hidden"
      >
        <Printer size={16} />
        Print
      </button>

      <div id="gift-card" className="flex w-full flex-col gap-6">
        {giftItems.map((item, idx) => (
          <div
            key={`${item.variantId}-${idx}`}
            className="gift-card-item flex min-h-[300px] flex-col items-center justify-center gap-6 rounded-2xl border-4 border-double border-zinc-300 bg-white p-10 text-center"
          >
            <Gift className="text-zinc-400" size={28} />
            <p className="text-xs tracking-[0.4em] text-zinc-400 uppercase">
              A Gift From KISWA
            </p>
            <p className="font-serif text-2xl text-zinc-900">
              For {item.giftRecipientName || "You"}
            </p>
            {item.giftMessage && (
              <p className="max-w-sm text-balance font-serif text-lg leading-relaxed text-zinc-700 italic">
                &ldquo;{item.giftMessage}&rdquo;
              </p>
            )}
            {item.giftSenderName && (
              <p className="text-sm tracking-wide text-zinc-500">
                — {item.giftSenderName}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

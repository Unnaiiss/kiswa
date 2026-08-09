import type { Metadata } from "next";
import { WhatsAppOrderScreen } from "@/components/admin/whatsapp-orders/whatsapp-order-screen";

export const metadata: Metadata = {
  title: "WhatsApp Orders",
};

export default function AdminWhatsAppOrdersPage() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-50">WhatsApp Orders</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Once you&apos;ve confirmed availability, payment and delivery with a customer over
          WhatsApp, key it in here — this deducts stock exactly like a POS sale and gives the
          order a real invoice number. WhatsApp chats themselves never touch stock.
        </p>
      </div>
      <WhatsAppOrderScreen />
    </div>
  );
}

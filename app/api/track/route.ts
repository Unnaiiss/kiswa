import { NextResponse } from "next/server";
import { z } from "zod";
import { salesCollection } from "@/lib/firestore/admin-collections";
import { normalizeOrderStatus } from "@/lib/orderFulfillment";
import { rateLimit } from "@/lib/server/rateLimit";

const requestSchema = z.object({
  invoiceNo: z.string().trim().min(1),
  phone: z.string().trim().min(1),
});

/** Last 10 digits, so "9995778963", "+91 99957 78963", and "919995778963"
 * all normalize the same way for comparison — customerPhone is stored as a
 * bare 10-digit number everywhere in this app (see lib/whatsapp.ts's own
 * comment on the same convention), but a guest typing their number in by
 * hand may include spaces/a country code. */
function normalizePhone(value: string): string {
  return value.replace(/\D/g, "").slice(-10);
}

/** { found: false } for BOTH "no such invoice" and "invoice exists but the
 * phone doesn't match" — same status code, same shape, same timing profile
 * (both paths do one Firestore query) — so a guest fishing for a valid
 * invoice number learns nothing from the response. Returns only the status
 * timeline + courier/tracking; no prices, no address, no customer name. */
export async function POST(request: Request) {
  const limited = rateLimit(request, "track", { limit: 10, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  const json = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter an invoice number and phone number." }, { status: 400 });
  }

  const invoiceNo = parsed.data.invoiceNo.toUpperCase();
  const phone = normalizePhone(parsed.data.phone);

  const snap = await salesCollection().where("invoiceNo", "==", invoiceNo).limit(1).get();
  const sale = snap.empty ? null : snap.docs[0].data();

  if (!sale || normalizePhone(sale.customerPhone) !== phone) {
    return NextResponse.json({ found: false });
  }

  return NextResponse.json({
    found: true,
    invoiceNo: sale.invoiceNo,
    orderStatus: normalizeOrderStatus(sale.orderStatus),
    statusHistory: (sale.statusHistory ?? []).map((entry) => ({
      status: normalizeOrderStatus(entry.status),
      timestamp: entry.timestamp.toDate().toISOString(),
    })),
    shipping: sale.shipping
      ? {
          courierName: sale.shipping.courierName,
          trackingNumber: sale.shipping.trackingNumber,
          trackingUrl: sale.shipping.trackingUrl,
        }
      : null,
  });
}

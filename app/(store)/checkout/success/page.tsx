import Link from "next/link";
import { notFound } from "next/navigation";
import {
  pendingOrdersCollection,
  salesCollection,
} from "@/lib/firestore/admin-collections";
import { OrderInvoice } from "@/components/store/order-invoice";

interface SuccessPageProps {
  // orderId: the Razorpay flow — a pendingOrders doc id, resolved to a sale
  // below once its payment has been verified (possibly not yet, hence the
  // "confirming" interim state). saleId: Cash on Delivery — recordSale runs
  // synchronously with no payment to verify, so there's no pendingOrder at
  // all, just the real sale id straight away. Exactly one is ever set.
  searchParams: Promise<{ orderId?: string; saleId?: string }>;
}

export default async function CheckoutSuccessPage({
  searchParams,
}: SuccessPageProps) {
  const { orderId, saleId } = await searchParams;
  if (!orderId && !saleId) notFound();

  if (saleId) {
    const saleSnap = await salesCollection().doc(saleId).get();
    const sale = saleSnap.data();
    if (!saleSnap.exists || !sale) notFound();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- discarded on purpose, see comment further below
    const { createdAt, statusHistory, shipping, ...saleForInvoice } = sale;
    return (
      <main className="mx-auto flex max-w-2xl flex-1 flex-col items-center px-6 py-24 text-center">
        <p className="text-xs uppercase tracking-[0.4em] text-kiswa-gold-soft">Order confirmed</p>
        <h1 className="mt-3 font-display text-4xl text-kiswa-ink">
          Thank you, {sale.customerName.split(" ")[0]}
        </h1>
        <p className="mt-4 text-kiswa-ink-muted">Your invoice number is</p>
        <p className="mt-1 font-display text-3xl tracking-widest text-kiswa-gold">
          {sale.invoiceNo}
        </p>
        {sale.paymentMethod === "cod" && (
          <p className="mt-3 max-w-sm text-sm text-kiswa-ink-muted">
            Pay in cash (or UPI/card, if your courier supports it) when your order is delivered.
          </p>
        )}
        <OrderInvoice sale={saleForInvoice} createdAt={createdAt.toDate()} />
      </main>
    );
  }

  const pendingSnap = await pendingOrdersCollection().doc(orderId!).get();
  const pending = pendingSnap.data();
  if (!pendingSnap.exists || !pending) notFound();

  if (pending.status === "refund_flagged") {
    return (
      <main className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        <p className="text-xs uppercase tracking-[0.4em] text-kiswa-gold-soft">
          Payment received
        </p>
        <h1 className="font-display text-3xl text-kiswa-ink">
          One item just sold out
        </h1>
        <p className="text-kiswa-ink-muted">
          Your payment for order{" "}
          <span className="text-kiswa-ink">{orderId}</span> was received, but
          an item in your bag sold out at the same moment. Our team has been
          notified and will contact you shortly to arrange a refund or
          replacement.
        </p>
        <Link
          href="/shop"
          className="mt-2 cursor-pointer text-sm font-medium tracking-wide text-kiswa-gold underline underline-offset-4 hover:text-kiswa-gold-soft"
        >
          Continue shopping
        </Link>
      </main>
    );
  }

  if (pending.status !== "completed" || !pending.saleId) {
    return (
      <main className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        <p className="text-xs uppercase tracking-[0.4em] text-kiswa-gold-soft">
          Almost there
        </p>
        <h1 className="font-display text-3xl text-kiswa-ink">
          Confirming your payment…
        </h1>
        <p className="text-kiswa-ink-muted">
          This is taking a little longer than usual. Refresh this page in a
          few seconds — we&apos;re finalizing order{" "}
          <span className="text-kiswa-ink">{orderId}</span>.
        </p>
      </main>
    );
  }

  const saleSnap = await salesCollection().doc(pending.saleId).get();
  const sale = saleSnap.data();
  if (!saleSnap.exists || !sale) notFound();

  // sale.createdAt, statusHistory (per-entry), and shipping (dispatchDate/
  // expectedDeliveryDate) all carry real Firestore Timestamp instances —
  // not plain objects, so none can be passed to the OrderInvoice client
  // component as-is; OrderInvoice doesn't render any of them anyway.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- discarded on purpose, see comment above
  const { createdAt, statusHistory, shipping, ...saleForInvoice } = sale;

  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col items-center px-6 py-24 text-center">
      <p className="text-xs uppercase tracking-[0.4em] text-kiswa-gold-soft">
        Order confirmed
      </p>
      <h1 className="mt-3 font-display text-4xl text-kiswa-ink">
        Thank you, {sale.customerName.split(" ")[0]}
      </h1>
      <p className="mt-4 text-kiswa-ink-muted">Your invoice number is</p>
      <p className="mt-1 font-display text-3xl tracking-widest text-kiswa-gold">
        {sale.invoiceNo}
      </p>

      <OrderInvoice sale={saleForInvoice} createdAt={createdAt.toDate()} />
    </main>
  );
}

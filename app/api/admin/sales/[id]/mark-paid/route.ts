import { NextResponse } from "next/server";
import { AuthError, requireRole } from "@/lib/server/authGuard";
import { salesCollection } from "@/lib/firestore/admin-collections";

/** Flips a Cash on Delivery sale's paymentStatus from 'pending' to 'paid'
 * once the courier has actually collected payment — a plain field update,
 * deliberately scoped to COD only (Razorpay orders are already 'paid' the
 * moment recordSale runs; POS cash/upi/card sales are too) and only from
 * 'pending' (a no-op 409 otherwise, so this can't silently "re-mark" an
 * already-paid or already-refunded order). Never touches stock or
 * orderStatus — those are independent concerns (see PATCH .../status and
 * .../refund). */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(request, ["admin"]);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const { id } = await params;
  const ref = salesCollection().doc(id);
  const snap = await ref.get();
  const sale = snap.data();
  if (!snap.exists || !sale) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (sale.paymentMethod !== "cod") {
    return NextResponse.json({ error: "This action is only for Cash on Delivery orders." }, { status: 400 });
  }
  if (sale.paymentStatus !== "pending") {
    return NextResponse.json({ error: `This order's payment is already "${sale.paymentStatus}".` }, { status: 409 });
  }

  await ref.update({ paymentStatus: "paid" });
  return NextResponse.json({ ok: true });
}

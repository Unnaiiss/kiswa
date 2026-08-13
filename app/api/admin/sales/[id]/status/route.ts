import { NextResponse } from "next/server";
import { z } from "zod";
import { salesCollection } from "@/lib/firestore/admin-collections";
import { AuthError, requireRole } from "@/lib/server/authGuard";
import { updateOrderStatus } from "@/lib/server/orderFulfillment";
import { isValidStatusTransition, normalizeOrderStatus } from "@/lib/orderFulfillment";
import { toErrorResponse } from "@/lib/server/apiError";

const bodySchema = z.object({
  orderStatus: z.enum([
    "pending",
    "confirmed",
    "packed",
    "shipped",
    "out_for_delivery",
    "delivered",
    "cancelled",
    "returned",
  ]),
  note: z.string().trim().max(500).nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let decoded;
  try {
    decoded = await requireRole(request, ["admin"]);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const { id } = await params;

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const ref = salesCollection().doc(id);
  const snap = await ref.get();
  const sale = snap.data();
  if (!snap.exists || !sale) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Fast, friendly failure up front — updateOrderStatus re-checks this
  // itself inside the transaction, which is the actual authority.
  const currentStatus = normalizeOrderStatus(sale.orderStatus);
  if (!isValidStatusTransition(currentStatus, parsed.data.orderStatus)) {
    return NextResponse.json(
      { error: `Cannot move this order from "${currentStatus}" to "${parsed.data.orderStatus}".` },
      { status: 409 },
    );
  }

  try {
    await updateOrderStatus({
      saleId: id,
      newStatus: parsed.data.orderStatus,
      actingUid: decoded.uid,
      actingName: decoded.name ?? null,
      note: parsed.data.note ?? null,
    });
  } catch (err) {
    return toErrorResponse(err, "admin/sales/status", "Could not update this order's status.");
  }

  return NextResponse.json({ ok: true });
}

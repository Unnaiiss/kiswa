import { NextResponse } from "next/server";
import { z } from "zod";
import { Timestamp } from "firebase-admin/firestore";
import { salesCollection } from "@/lib/firestore/admin-collections";
import { AuthError, requireRole } from "@/lib/server/authGuard";

/** Courier/tracking info — independent of status changes (an admin might
 * enter tracking before or after marking an order 'shipped'), so this is a
 * separate route from status updates and never touches statusHistory or
 * stock. Every field is a partial update: only keys present in the body
 * are changed, so the admin panel can save one field at a time without
 * clobbering the others. */
const bodySchema = z.object({
  courierName: z.string().trim().max(100).nullable().optional(),
  trackingNumber: z.string().trim().max(100).nullable().optional(),
  trackingUrl: z.string().trim().url("Enter a valid URL").nullable().optional().or(z.literal("").transform(() => null)),
  dispatchDate: z.string().trim().nullable().optional(),
  expectedDeliveryDate: z.string().trim().nullable().optional(),
  deliveryNotes: z.string().trim().max(500).nullable().optional(),
});

export async function PATCH(
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

  const { dispatchDate, expectedDeliveryDate, ...rest } = parsed.data;
  const existing = sale.shipping ?? {
    courierName: null,
    trackingNumber: null,
    trackingUrl: null,
    dispatchDate: null,
    expectedDeliveryDate: null,
    deliveryNotes: null,
  };

  const nextShipping = {
    ...existing,
    ...rest,
    ...(dispatchDate !== undefined && {
      dispatchDate: dispatchDate ? Timestamp.fromDate(new Date(dispatchDate)) : null,
    }),
    ...(expectedDeliveryDate !== undefined && {
      expectedDeliveryDate: expectedDeliveryDate ? Timestamp.fromDate(new Date(expectedDeliveryDate)) : null,
    }),
  };

  await ref.update({ shipping: nextShipping });

  return NextResponse.json({ ok: true });
}

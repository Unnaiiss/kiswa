import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requireRole } from "@/lib/server/authGuard";
import { updateOrderStatus } from "@/lib/server/orderFulfillment";
import { PublicError } from "@/lib/server/publicError";
import { logError } from "@/lib/server/logger";

const bodySchema = z.object({
  saleIds: z.array(z.string().min(1)).min(1, "Select at least one order").max(200),
  newStatus: z.enum([
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

/**
 * Bulk-advance a set of orders to the same status in one action — each
 * order still goes through updateOrderStatus's own transaction
 * independently (a single cross-document transaction touching many sales'
 * different products at once isn't practical), so a mix of eligible and
 * ineligible orders in the same selection partially succeeds rather than
 * all-or-nothing; the response reports exactly which ids succeeded and why
 * each failure failed, so the admin UI can show precisely what happened
 * rather than a single opaque error for the whole batch.
 */
export async function POST(request: Request) {
  let decoded;
  try {
    decoded = await requireRole(request, ["admin"]);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const succeeded: string[] = [];
  const failed: { saleId: string; error: string }[] = [];

  for (const saleId of parsed.data.saleIds) {
    try {
      await updateOrderStatus({
        saleId,
        newStatus: parsed.data.newStatus,
        actingUid: decoded.uid,
        actingName: decoded.name ?? null,
        note: parsed.data.note ?? null,
      });
      succeeded.push(saleId);
    } catch (err) {
      const message = err instanceof PublicError ? err.message : "Could not update this order.";
      if (!(err instanceof PublicError)) logError("admin/sales/bulk-status", err);
      failed.push({ saleId, error: message });
    }
  }

  return NextResponse.json({ succeeded, failed });
}

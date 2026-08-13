import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requireRole } from "@/lib/server/authGuard";
import { recordRefund } from "@/lib/server/refundSale";
import { toErrorResponse } from "@/lib/server/apiError";

const bodySchema = z.object({
  status: z.enum(["pending", "completed"]),
  amountInr: z.number().positive(),
  reason: z.string().trim().min(1, "A reason is required").max(500),
  restock: z.boolean(),
});

export async function POST(
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

  try {
    await recordRefund({
      saleId: id,
      status: parsed.data.status,
      amountInr: parsed.data.amountInr,
      reason: parsed.data.reason,
      restock: parsed.data.restock,
      actingUid: decoded.uid,
      actingName: decoded.name ?? null,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err, "admin/sales/refund", "Could not record this refund.");
  }
}

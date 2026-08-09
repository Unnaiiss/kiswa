import { NextResponse } from "next/server";
import { stockAdjustInputSchema, stockAdjust } from "@/lib/server/stockAdjust";
import { AuthError, requireRole } from "@/lib/server/authGuard";
import { toErrorResponse } from "@/lib/server/apiError";

export async function POST(request: Request) {
  try {
    await requireRole(request, ["admin"]);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const json = await request.json().catch(() => null);
  const parsed = stockAdjustInputSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  try {
    await stockAdjust(parsed.data);
  } catch (err) {
    return toErrorResponse(err, "admin/stock/adjust", "Could not adjust stock.");
  }

  return NextResponse.json({ ok: true });
}

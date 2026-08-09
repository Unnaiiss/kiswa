import { NextResponse } from "next/server";
import { stockInInputSchema, stockIn } from "@/lib/server/stockIn";
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
  const parsed = stockInInputSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  try {
    await stockIn(parsed.data);
  } catch (err) {
    return toErrorResponse(err, "admin/stock/in", "Could not add stock.");
  }

  return NextResponse.json({ ok: true });
}

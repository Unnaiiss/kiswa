import { NextResponse } from "next/server";
import { z } from "zod";
import { salesCollection } from "@/lib/firestore/admin-collections";
import { AuthError, requireRole } from "@/lib/server/authGuard";
import { restockCancelledSale } from "@/lib/server/restockCancelledSale";

const bodySchema = z.object({
  orderStatus: z.enum(["paid", "packed", "shipped", "delivered", "cancelled"]),
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
    return NextResponse.json({ error: "Sale not found" }, { status: 404 });
  }
  if (sale.channel !== "online") {
    return NextResponse.json(
      { error: "Only online orders can have their status updated." },
      { status: 400 },
    );
  }

  if (parsed.data.orderStatus === "cancelled") {
    if (sale.orderStatus === "cancelled") {
      return NextResponse.json({ ok: true });
    }
    try {
      await restockCancelledSale(id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not cancel the order.";
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  }

  await ref.update({ orderStatus: parsed.data.orderStatus });

  return NextResponse.json({ ok: true });
}

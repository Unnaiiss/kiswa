import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { bannersCollection } from "@/lib/firestore/admin-collections";
import { AuthError, requireRole } from "@/lib/server/authGuard";

const reorderSchema = z.object({
  order: z
    .array(
      z.object({
        id: z.string().trim().min(1),
        order: z.number().int().nonnegative(),
      }),
    )
    .min(1),
});

export async function PATCH(request: Request) {
  try {
    await requireRole(request, ["admin"]);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const json = await request.json().catch(() => null);
  const parsed = reorderSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const batch = adminDb.batch();
  for (const item of parsed.data.order) {
    batch.update(bannersCollection().doc(item.id), {
      order: item.order,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { importedSectionDocRef } from "@/lib/firestore/admin-collections";
import { AuthError, requireRole } from "@/lib/server/authGuard";

const fieldsSchema = z.object({
  isEnabled: z.boolean(),
  heading: z.string().trim().min(1, "Heading is required"),
  subline: z.string().trim().min(1, "Subline is required"),
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
  const parsed = fieldsSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }
  const input = parsed.data;

  await importedSectionDocRef().set({
    isEnabled: input.isEnabled,
    heading: input.heading,
    subline: input.subline,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true });
}

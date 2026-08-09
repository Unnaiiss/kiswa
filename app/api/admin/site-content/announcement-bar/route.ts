import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { announcementBarDocRef } from "@/lib/firestore/admin-collections";
import { AuthError, requireRole } from "@/lib/server/authGuard";

const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Enter a color as a 6-digit hex code, e.g. #4a1220");

const fieldsSchema = z.object({
  isEnabled: z.boolean(),
  messages: z.array(z.string().trim().min(1)).default([]),
  backgroundColor: hexColorSchema,
  textColor: hexColorSchema,
  speed: z.enum(["slow", "normal", "fast"]),
  linkUrl: z.string().trim().optional(),
  validFrom: z.string().trim().optional(),
  validUntil: z.string().trim().optional(),
});

function isValidLinkUrl(value: string) {
  return /^\//.test(value) || /^https?:\/\//i.test(value);
}

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

  const linkUrl = input.linkUrl?.trim() || null;
  if (linkUrl && !isValidLinkUrl(linkUrl)) {
    return NextResponse.json(
      { error: "Link must be an internal path starting with / or a full https:// URL" },
      { status: 400 },
    );
  }

  const validFrom = input.validFrom ? new Date(input.validFrom) : null;
  const validUntil = input.validUntil ? new Date(input.validUntil) : null;
  if (validFrom && Number.isNaN(validFrom.getTime())) {
    return NextResponse.json({ error: "Invalid start date" }, { status: 400 });
  }
  if (validUntil && Number.isNaN(validUntil.getTime())) {
    return NextResponse.json({ error: "Invalid end date" }, { status: 400 });
  }
  if (validFrom && validUntil && validFrom > validUntil) {
    return NextResponse.json({ error: "Start date must be before end date" }, { status: 400 });
  }

  await announcementBarDocRef().set({
    isEnabled: input.isEnabled,
    messages: input.messages,
    backgroundColor: input.backgroundColor,
    textColor: input.textColor,
    speed: input.speed,
    linkUrl,
    validFrom: validFrom ? Timestamp.fromDate(validFrom) : null,
    validUntil: validUntil ? Timestamp.fromDate(validUntil) : null,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true });
}

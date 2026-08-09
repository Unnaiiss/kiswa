import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { siteSettingsDocRef } from "@/lib/firestore/admin-collections";
import { AuthError, requireRole } from "@/lib/server/authGuard";

// Empty string means "leave this field unset" and is always allowed
// alongside the real format check, since admins clear fields via this same
// PATCH rather than a separate "unset" endpoint.
const urlSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || /^https:\/\//i.test(v), "Must be a full https:// URL")
  .optional();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const fieldsSchema = z.object({
  brandName: z.string().trim().min(1, "Brand name is required"),
  tagline: z.string().trim().min(1, "Tagline is required"),
  shortDescription: z.string().trim().min(1, "Short description is required"),
  whatsappNumber: z
    .string()
    .trim()
    .regex(/^\d{10,15}$/, "WhatsApp number must be digits only, with country code and no +, e.g. 919995778963"),
  instagramUrl: urlSchema,
  facebookUrl: urlSchema,
  youtubeUrl: urlSchema,
  mapUrl: urlSchema,
  email: z
    .string()
    .trim()
    .refine((v) => v === "" || EMAIL_RE.test(v), "Enter a valid email address")
    .optional(),
  phone: z.string().trim().optional(),
  addressLine: z.string().trim().optional(),
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

  await siteSettingsDocRef().set({
    brandName: input.brandName,
    tagline: input.tagline,
    shortDescription: input.shortDescription,
    whatsappNumber: input.whatsappNumber,
    instagramUrl: input.instagramUrl?.trim() || null,
    facebookUrl: input.facebookUrl?.trim() || null,
    youtubeUrl: input.youtubeUrl?.trim() || null,
    mapUrl: input.mapUrl?.trim() || null,
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    addressLine: input.addressLine?.trim() || null,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true });
}

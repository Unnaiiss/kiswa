import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { giftSectionDocRef } from "@/lib/firestore/admin-collections";
import { deleteBannerImage, saveBannerImage } from "@/lib/server/bannerImages";
import { AuthError, requireRole } from "@/lib/server/authGuard";

const fieldsSchema = z.object({
  heading: z.string().trim().min(1, "Heading is required"),
  body: z.string().trim().min(1, "Body text is required"),
  buttonLabel: z.string().trim().min(1, "Button label is required"),
  removeMobileImage: z.enum(["true", "false"]).optional(),
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

  const ref = giftSectionDocRef();
  const snap = await ref.get();
  const current = snap.data();

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = fieldsSchema.safeParse({
    heading: formData.get("heading"),
    body: formData.get("body"),
    buttonLabel: formData.get("buttonLabel"),
    removeMobileImage: formData.get("removeMobileImage") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const desktopImage = formData.get("desktopImage");
  let imageUrl = current?.imageUrl ?? null;
  if (desktopImage instanceof File && desktopImage.size > 0) {
    imageUrl = await saveBannerImage(desktopImage);
    if (current?.imageUrl) await deleteBannerImage(current.imageUrl);
  }
  if (!imageUrl) {
    return NextResponse.json({ error: "A desktop image is required" }, { status: 400 });
  }

  const mobileImage = formData.get("mobileImage");
  let imageUrlMobile = current?.imageUrlMobile ?? null;
  if (mobileImage instanceof File && mobileImage.size > 0) {
    imageUrlMobile = await saveBannerImage(mobileImage);
    if (current?.imageUrlMobile) await deleteBannerImage(current.imageUrlMobile);
  } else if (input.removeMobileImage === "true") {
    if (current?.imageUrlMobile) await deleteBannerImage(current.imageUrlMobile);
    imageUrlMobile = null;
  }

  await ref.set({
    imageUrl,
    imageUrlMobile,
    heading: input.heading,
    body: input.body,
    buttonLabel: input.buttonLabel,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true });
}

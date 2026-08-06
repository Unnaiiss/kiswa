import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { ourStorySectionDocRef } from "@/lib/firestore/admin-collections";
import { deleteBannerImage, saveBannerImage } from "@/lib/server/bannerImages";
import { AuthError, requireRole } from "@/lib/server/authGuard";

const boolField = z.enum(["true", "false"]).optional();

const fieldsSchema = z.object({
  removeOilDesktopImage: boolField,
  removeOilMobileImage: boolField,
  removeSprayDesktopImage: boolField,
  removeSprayMobileImage: boolField,
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

  const ref = ourStorySectionDocRef();
  const snap = await ref.get();
  const current = snap.data();

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = fieldsSchema.safeParse({
    removeOilDesktopImage: formData.get("removeOilDesktopImage") ?? undefined,
    removeOilMobileImage: formData.get("removeOilMobileImage") ?? undefined,
    removeSprayDesktopImage: formData.get("removeSprayDesktopImage") ?? undefined,
    removeSprayMobileImage: formData.get("removeSprayMobileImage") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const input = parsed.data;

  async function resolveImage(
    fileField: string,
    remove: boolean,
    currentUrl: string | null | undefined,
  ): Promise<string | null> {
    const file = formData!.get(fileField);
    if (file instanceof File && file.size > 0) {
      const url = await saveBannerImage(file);
      if (currentUrl) await deleteBannerImage(currentUrl);
      return url;
    }
    if (remove) {
      if (currentUrl) await deleteBannerImage(currentUrl);
      return null;
    }
    return currentUrl ?? null;
  }

  const oilCardImageUrl = await resolveImage(
    "oilDesktopImage",
    input.removeOilDesktopImage === "true",
    current?.oilCardImageUrl,
  );
  const oilCardImageUrlMobile = await resolveImage(
    "oilMobileImage",
    input.removeOilMobileImage === "true",
    current?.oilCardImageUrlMobile,
  );
  const sprayCardImageUrl = await resolveImage(
    "sprayDesktopImage",
    input.removeSprayDesktopImage === "true",
    current?.sprayCardImageUrl,
  );
  const sprayCardImageUrlMobile = await resolveImage(
    "sprayMobileImage",
    input.removeSprayMobileImage === "true",
    current?.sprayCardImageUrlMobile,
  );

  await ref.set({
    oilCardImageUrl,
    oilCardImageUrlMobile,
    sprayCardImageUrl,
    sprayCardImageUrlMobile,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true });
}

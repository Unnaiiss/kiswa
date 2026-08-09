import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { bannersCollection, combosCollection } from "@/lib/firestore/admin-collections";
import { saveBannerImage } from "@/lib/server/bannerImages";
import { AuthError, requireRole } from "@/lib/server/authGuard";
import { InvalidImageUploadError } from "@/lib/server/localImageStorage";
import { rateLimit } from "@/lib/server/rateLimit";

const commonFields = {
  order: z.coerce.number().int().nonnegative(),
  isActive: z.enum(["true", "false"]),
};

const imageFieldsSchema = z.object({
  bannerType: z.literal("image"),
  altText: z.string().trim().min(1, "Alt text is required"),
  linkUrl: z.string().trim().optional(),
  buttonEnabled: z.enum(["true", "false"]).default("false"),
  buttonLabel: z.string().trim().optional(),
  buttonLink: z.string().trim().optional(),
  buttonPosition: z
    .enum(["bottom-center", "bottom-left", "center"])
    .default("bottom-center"),
  ...commonFields,
});

const comboFieldsSchema = z.object({
  bannerType: z.literal("combo"),
  comboId: z.string().trim().min(1, "Select a combo"),
  headlineOverride: z.string().trim().optional(),
  buttonLabelOverride: z.string().trim().optional(),
  ...commonFields,
});

const fieldsSchema = z.discriminatedUnion("bannerType", [
  imageFieldsSchema,
  comboFieldsSchema,
]);

function isValidLinkUrl(value: string) {
  return /^\//.test(value) || /^https?:\/\//i.test(value);
}

export async function POST(request: Request) {
  try {
    await requireRole(request, ["admin"]);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const limited = rateLimit(request, "admin:banners", { limit: 30, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = fieldsSchema.safeParse({
    bannerType: formData.get("bannerType") ?? "image",
    order: formData.get("order"),
    isActive: formData.get("isActive"),
    altText: formData.get("altText") ?? undefined,
    linkUrl: formData.get("linkUrl") ?? undefined,
    buttonEnabled: formData.get("buttonEnabled") ?? undefined,
    buttonLabel: formData.get("buttonLabel") ?? undefined,
    buttonLink: formData.get("buttonLink") ?? undefined,
    buttonPosition: formData.get("buttonPosition") ?? undefined,
    comboId: formData.get("comboId") ?? undefined,
    headlineOverride: formData.get("headlineOverride") ?? undefined,
    buttonLabelOverride: formData.get("buttonLabelOverride") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }
  const input = parsed.data;

  if (input.bannerType === "combo") {
    const comboSnap = await combosCollection().doc(input.comboId).get();
    if (!comboSnap.exists) {
      return NextResponse.json({ error: "Selected combo not found" }, { status: 400 });
    }

    const ref = await bannersCollection().add({
      bannerType: "combo",
      comboId: input.comboId,
      headlineOverride: input.headlineOverride?.trim() || null,
      buttonLabelOverride: input.buttonLabelOverride?.trim() || null,
      order: input.order,
      isActive: input.isActive === "true",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ id: ref.id });
  }

  const linkUrl = input.linkUrl?.trim() || null;
  if (linkUrl && !isValidLinkUrl(linkUrl)) {
    return NextResponse.json(
      { error: "Link must be an internal path starting with / or a full https:// URL" },
      { status: 400 },
    );
  }

  const buttonEnabled = input.buttonEnabled === "true";
  const buttonLabel = input.buttonLabel?.trim() || null;
  const buttonLink = input.buttonLink?.trim() || null;
  if (buttonEnabled) {
    if (!buttonLabel) {
      return NextResponse.json(
        { error: "Button label is required when the button is enabled" },
        { status: 400 },
      );
    }
    if (!buttonLink || !isValidLinkUrl(buttonLink)) {
      return NextResponse.json(
        { error: "Button link must be an internal path starting with / or a full https:// URL" },
        { status: 400 },
      );
    }
  }

  const desktopImage = formData.get("desktopImage");
  if (!(desktopImage instanceof File) || desktopImage.size === 0) {
    return NextResponse.json({ error: "A desktop image is required" }, { status: 400 });
  }
  const mobileImage = formData.get("mobileImage");

  let imageUrl: string;
  let imageUrlMobile: string | null;
  try {
    imageUrl = await saveBannerImage(desktopImage);
    imageUrlMobile =
      mobileImage instanceof File && mobileImage.size > 0
        ? await saveBannerImage(mobileImage)
        : null;
  } catch (err) {
    if (err instanceof InvalidImageUploadError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  const ref = await bannersCollection().add({
    bannerType: "image",
    imageUrl,
    imageUrlMobile,
    altText: input.altText,
    linkUrl,
    order: input.order,
    isActive: input.isActive === "true",
    buttonEnabled,
    buttonLabel,
    buttonLink,
    buttonPosition: input.buttonPosition,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ id: ref.id });
}

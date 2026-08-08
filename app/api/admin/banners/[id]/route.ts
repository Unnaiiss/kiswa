import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { bannersCollection, combosCollection } from "@/lib/firestore/admin-collections";
import { deleteBannerImage, saveBannerImage } from "@/lib/server/bannerImages";
import { AuthError, requireRole } from "@/lib/server/authGuard";

const commonFields = {
  order: z.coerce.number().int().nonnegative(),
  isActive: z.enum(["true", "false"]),
};

const imageFieldsSchema = z.object({
  bannerType: z.literal("image"),
  altText: z.string().trim().min(1, "Alt text is required"),
  linkUrl: z.string().trim().optional(),
  removeMobileImage: z.enum(["true", "false"]).optional(),
  // Optional (not defaulted) — absent means "leave as-is" (e.g. the
  // active-toggle quick action in the admin table only submits
  // altText/linkUrl/order/isActive and shouldn't reset the button fields).
  buttonEnabled: z.enum(["true", "false"]).optional(),
  buttonLabel: z.string().trim().optional(),
  buttonLink: z.string().trim().optional(),
  buttonPosition: z.enum(["bottom-center", "bottom-left", "center"]).optional(),
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
  const ref = bannersCollection().doc(id);
  const snap = await ref.get();
  const current = snap.data();
  if (!snap.exists || !current) {
    return NextResponse.json({ error: "Banner not found" }, { status: 404 });
  }
  // Missing on banners saved before bannerType existed — same
  // treat-missing-as-"image" rule as every other read site.
  const currentBannerType = current.bannerType === "combo" ? "combo" : "image";

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
    removeMobileImage: formData.get("removeMobileImage") ?? undefined,
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

  if (input.bannerType !== currentBannerType) {
    return NextResponse.json(
      { error: "A banner's type can't be changed after creation." },
      { status: 400 },
    );
  }

  if (input.bannerType === "combo") {
    const comboSnap = await combosCollection().doc(input.comboId).get();
    if (!comboSnap.exists) {
      return NextResponse.json({ error: "Selected combo not found" }, { status: 400 });
    }

    await ref.update({
      comboId: input.comboId,
      headlineOverride: input.headlineOverride?.trim() || null,
      buttonLabelOverride: input.buttonLabelOverride?.trim() || null,
      order: input.order,
      isActive: input.isActive === "true",
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  }

  // Below this point current/input are both the "image" banner shape —
  // current is narrowed at runtime (currentBannerType === "image"), but its
  // static type is still the full BannerDoc union, so field access on
  // image-only properties (imageUrl, buttonEnabled, ...) needs the cast.
  const currentImage = current as Extract<typeof current, { bannerType: "image" }>;

  const linkUrl = input.linkUrl?.trim() || null;
  if (linkUrl && !isValidLinkUrl(linkUrl)) {
    return NextResponse.json(
      { error: "Link must be an internal path starting with / or a full https:// URL" },
      { status: 400 },
    );
  }

  const buttonEnabled =
    input.buttonEnabled !== undefined
      ? input.buttonEnabled === "true"
      : currentImage.buttonEnabled;
  const buttonLabel =
    input.buttonLabel !== undefined ? input.buttonLabel.trim() || null : currentImage.buttonLabel;
  const buttonLink =
    input.buttonLink !== undefined ? input.buttonLink.trim() || null : currentImage.buttonLink;
  const buttonPosition = input.buttonPosition ?? currentImage.buttonPosition ?? "bottom-center";
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
  let imageUrl = currentImage.imageUrl;
  if (desktopImage instanceof File && desktopImage.size > 0) {
    imageUrl = await saveBannerImage(desktopImage);
    await deleteBannerImage(currentImage.imageUrl);
  }

  const mobileImage = formData.get("mobileImage");
  let imageUrlMobile = currentImage.imageUrlMobile;
  if (mobileImage instanceof File && mobileImage.size > 0) {
    imageUrlMobile = await saveBannerImage(mobileImage);
    await deleteBannerImage(currentImage.imageUrlMobile);
  } else if (input.removeMobileImage === "true") {
    await deleteBannerImage(currentImage.imageUrlMobile);
    imageUrlMobile = null;
  }

  await ref.update({
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
    buttonPosition,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
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
  const ref = bannersCollection().doc(id);
  const snap = await ref.get();
  const current = snap.data();
  if (!snap.exists || !current) {
    return NextResponse.json({ error: "Banner not found" }, { status: 404 });
  }

  await ref.delete();
  if (current.bannerType !== "combo") {
    await deleteBannerImage(current.imageUrl);
    await deleteBannerImage(current.imageUrlMobile);
  }

  return NextResponse.json({ ok: true });
}

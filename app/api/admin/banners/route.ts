import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { bannersCollection } from "@/lib/firestore/admin-collections";
import { saveBannerImage } from "@/lib/server/bannerImages";
import { AuthError, requireRole } from "@/lib/server/authGuard";

const fieldsSchema = z.object({
  altText: z.string().trim().min(1, "Alt text is required"),
  linkUrl: z.string().trim().optional(),
  order: z.coerce.number().int().nonnegative(),
  isActive: z.enum(["true", "false"]),
  buttonEnabled: z.enum(["true", "false"]).default("false"),
  buttonLabel: z.string().trim().optional(),
  buttonLink: z.string().trim().optional(),
  buttonPosition: z
    .enum(["bottom-center", "bottom-left", "center"])
    .default("bottom-center"),
});

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

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = fieldsSchema.safeParse({
    altText: formData.get("altText"),
    linkUrl: formData.get("linkUrl") ?? undefined,
    order: formData.get("order"),
    isActive: formData.get("isActive"),
    buttonEnabled: formData.get("buttonEnabled") ?? undefined,
    buttonLabel: formData.get("buttonLabel") ?? undefined,
    buttonLink: formData.get("buttonLink") ?? undefined,
    buttonPosition: formData.get("buttonPosition") ?? undefined,
  });
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

  const imageUrl = await saveBannerImage(desktopImage);
  const imageUrlMobile =
    mobileImage instanceof File && mobileImage.size > 0
      ? await saveBannerImage(mobileImage)
      : null;

  const ref = await bannersCollection().add({
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

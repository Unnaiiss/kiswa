import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { bannersCollection } from "@/lib/firestore/admin-collections";
import { deleteBannerImage, saveBannerImage } from "@/lib/server/bannerImages";
import { AuthError, requireRole } from "@/lib/server/authGuard";

const fieldsSchema = z.object({
  altText: z.string().trim().min(1, "Alt text is required"),
  linkUrl: z.string().trim().optional(),
  order: z.coerce.number().int().nonnegative(),
  isActive: z.enum(["true", "false"]),
  removeMobileImage: z.enum(["true", "false"]).optional(),
  // Optional (not defaulted) — absent means "leave as-is" (e.g. the
  // active-toggle quick action in the admin table only submits
  // altText/linkUrl/order/isActive and shouldn't reset the button fields).
  buttonEnabled: z.enum(["true", "false"]).optional(),
  buttonLabel: z.string().trim().optional(),
  buttonLink: z.string().trim().optional(),
  buttonPosition: z.enum(["bottom-center", "bottom-left", "center"]).optional(),
});

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

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = fieldsSchema.safeParse({
    altText: formData.get("altText"),
    linkUrl: formData.get("linkUrl") ?? undefined,
    order: formData.get("order"),
    isActive: formData.get("isActive"),
    removeMobileImage: formData.get("removeMobileImage") ?? undefined,
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

  const buttonEnabled =
    input.buttonEnabled !== undefined
      ? input.buttonEnabled === "true"
      : current.buttonEnabled;
  const buttonLabel =
    input.buttonLabel !== undefined ? input.buttonLabel.trim() || null : current.buttonLabel;
  const buttonLink =
    input.buttonLink !== undefined ? input.buttonLink.trim() || null : current.buttonLink;
  const buttonPosition = input.buttonPosition ?? current.buttonPosition ?? "bottom-center";
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
  let imageUrl = current.imageUrl;
  if (desktopImage instanceof File && desktopImage.size > 0) {
    imageUrl = await saveBannerImage(desktopImage);
    await deleteBannerImage(current.imageUrl);
  }

  const mobileImage = formData.get("mobileImage");
  let imageUrlMobile = current.imageUrlMobile;
  if (mobileImage instanceof File && mobileImage.size > 0) {
    imageUrlMobile = await saveBannerImage(mobileImage);
    await deleteBannerImage(current.imageUrlMobile);
  } else if (input.removeMobileImage === "true") {
    await deleteBannerImage(current.imageUrlMobile);
    imageUrlMobile = null;
  }

  await ref.update({
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
  await deleteBannerImage(current.imageUrl);
  await deleteBannerImage(current.imageUrlMobile);

  return NextResponse.json({ ok: true });
}

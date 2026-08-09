import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { combosCollection } from "@/lib/firestore/admin-collections";
import { ComboValidationError, comboFieldsSchema, resolveComboFields } from "@/lib/server/comboFields";
import { deleteBannerImage, saveBannerImage } from "@/lib/server/bannerImages";
import { AuthError, requireRole } from "@/lib/server/authGuard";
import { InvalidImageUploadError } from "@/lib/server/localImageStorage";

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
  const ref = combosCollection().doc(id);
  const snap = await ref.get();
  const current = snap.data();
  if (!snap.exists || !current) {
    return NextResponse.json({ error: "Combo not found" }, { status: 404 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = comboFieldsSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    description: formData.get("description") ?? "",
    comboPriceInr: formData.get("comboPriceInr"),
    type: formData.get("type"),
    itemsJson: formData.get("itemsJson") ?? "[]",
    chooseCount: formData.get("chooseCount") ?? undefined,
    eligibleVariantsJson: formData.get("eligibleVariantsJson") ?? "[]",
    isActive: formData.get("isActive"),
    order: formData.get("order"),
    validFrom: formData.get("validFrom") ?? undefined,
    validUntil: formData.get("validUntil") ?? undefined,
    badgeText: formData.get("badgeText") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  if (parsed.data.slug !== current.slug) {
    const existingSlug = await combosCollection().where("slug", "==", parsed.data.slug).get();
    if (existingSlug.docs.some((d) => d.id !== id)) {
      return NextResponse.json({ error: "A combo with this slug already exists" }, { status: 400 });
    }
  }

  let fields;
  try {
    fields = await resolveComboFields(parsed.data);
  } catch (err) {
    if (err instanceof ComboValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  const desktopImage = formData.get("desktopImage");
  const mobileImage = formData.get("mobileImage");
  let imageUrl = current.imageUrl;
  let imageUrlMobile = current.imageUrlMobile;
  try {
    if (desktopImage instanceof File && desktopImage.size > 0) {
      imageUrl = await saveBannerImage(desktopImage);
      await deleteBannerImage(current.imageUrl);
    } else if (formData.get("removeDesktopImage") === "true") {
      await deleteBannerImage(current.imageUrl);
      imageUrl = null;
    }

    if (mobileImage instanceof File && mobileImage.size > 0) {
      imageUrlMobile = await saveBannerImage(mobileImage);
      await deleteBannerImage(current.imageUrlMobile);
    } else if (formData.get("removeMobileImage") === "true") {
      await deleteBannerImage(current.imageUrlMobile);
      imageUrlMobile = null;
    }
  } catch (err) {
    if (err instanceof InvalidImageUploadError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  await ref.update({
    ...fields,
    imageUrl,
    imageUrlMobile,
    validFrom: fields.validFrom ? Timestamp.fromDate(fields.validFrom) : null,
    validUntil: fields.validUntil ? Timestamp.fromDate(fields.validUntil) : null,
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
  const ref = combosCollection().doc(id);
  const snap = await ref.get();
  const current = snap.data();
  if (!snap.exists || !current) {
    return NextResponse.json({ error: "Combo not found" }, { status: 404 });
  }

  await ref.delete();
  await deleteBannerImage(current.imageUrl);
  await deleteBannerImage(current.imageUrlMobile);

  return NextResponse.json({ ok: true });
}

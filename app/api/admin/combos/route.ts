import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { combosCollection } from "@/lib/firestore/admin-collections";
import { ComboValidationError, comboFieldsSchema, resolveComboFields } from "@/lib/server/comboFields";
import { saveBannerImage } from "@/lib/server/bannerImages";
import { AuthError, requireRole } from "@/lib/server/authGuard";
import { InvalidImageUploadError } from "@/lib/server/imageStorage";
import { rateLimit } from "@/lib/server/rateLimit";

export async function POST(request: Request) {
  try {
    await requireRole(request, ["admin"]);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const limited = rateLimit(request, "admin:combos", { limit: 30, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

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

  const existingSlug = await combosCollection().where("slug", "==", parsed.data.slug).get();
  if (!existingSlug.empty) {
    return NextResponse.json({ error: "A combo with this slug already exists" }, { status: 400 });
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
  let imageUrl: string | null;
  let imageUrlMobile: string | null;
  try {
    imageUrl =
      desktopImage instanceof File && desktopImage.size > 0
        ? await saveBannerImage(desktopImage)
        : null;
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

  const ref = await combosCollection().add({
    ...fields,
    imageUrl,
    imageUrlMobile,
    validFrom: fields.validFrom ? Timestamp.fromDate(fields.validFrom) : null,
    validUntil: fields.validUntil ? Timestamp.fromDate(fields.validUntil) : null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ id: ref.id });
}

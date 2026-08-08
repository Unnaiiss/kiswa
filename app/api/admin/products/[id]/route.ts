import { NextResponse } from "next/server";
import { z } from "zod";
import { productsCollection } from "@/lib/firestore/admin-collections";
import { formatVariantLabel } from "@/lib/pricing";
import { AuthError, requireRole } from "@/lib/server/authGuard";
import { deleteProductImage } from "@/lib/server/productImages";
import type { ProductVariant } from "@/lib/firestore/types";

// Uploaded images resolve to a local path (e.g. "/products/<uuid>.jpg"),
// not an absolute URL — z.string().url() alone would reject those, so
// accept either an absolute https:// URL (pasted supplier links) or an
// internal path starting with /.
const imageUrlSchema = z
  .string()
  .trim()
  .refine(
    (v) => v.startsWith("/") || /^https?:\/\//i.test(v),
    "Enter a valid image URL",
  );

const baseFields = {
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim().default(""),
  notes: z.array(z.string().trim().min(1)).default([]),
  category: z.string().trim().min(1, "Category is required"),
  imageUrls: z.array(imageUrlSchema).default([]),
  isActive: z.boolean(),
};

const updateAttarSchema = z.object({
  productType: z.literal("attar"),
  ...baseFields,
  lowStockThresholdMl: z.number().nonnegative(),
  variants: z
    .array(
      z.object({
        // The variantId this row started as, so history can carry over when
        // a variant is edited — null means this is a brand-new row.
        originalVariantId: z.string().nullable(),
        type: z.enum(["oil", "spray"]),
        sizeMl: z.number().positive(),
        priceInr: z.number().nonnegative(),
        mrpInr: z.number().nonnegative(),
        oilMlPerUnit: z.number().positive(),
        isActive: z.boolean(),
      }),
    )
    .min(1, "At least one variant is required"),
});

const updateImportedSchema = z.object({
  productType: z.literal("imported"),
  ...baseFields,
  priceInr: z.number().nonnegative(),
  mrpInr: z.number().nonnegative(),
  sizeLabel: z.string().trim().min(1, "Size label is required"),
  brand: z.string().trim().nullable().default(null),
  lowStockThresholdUnits: z.number().int().nonnegative(),
});

const updateProductSchema = z.discriminatedUnion("productType", [
  updateAttarSchema,
  updateImportedSchema,
]);

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

  const json = await request.json().catch(() => null);
  const parsed = updateProductSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const ref = productsCollection().doc(id);
  const snap = await ref.get();
  const current = snap.data();
  if (!snap.exists || !current) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  if (current.productType !== input.productType) {
    return NextResponse.json(
      { error: "A product's type can't be changed after creation." },
      { status: 400 },
    );
  }

  // Any image the edit dropped that we uploaded ourselves (deleteProductImage
  // no-ops on pasted external URLs) is now orphaned — best-effort cleanup,
  // never blocks the save.
  const keptImageUrls = new Set(input.imageUrls);
  const removedImageUrls = current.imageUrls.filter((url) => !keptImageUrls.has(url));

  if (input.productType === "imported") {
    await ref.update({
      name: input.name,
      description: input.description,
      notes: input.notes,
      category: input.category,
      imageUrls: input.imageUrls,
      isActive: input.isActive,
      priceInr: input.priceInr,
      mrpInr: input.mrpInr,
      sizeLabel: input.sizeLabel,
      brand: input.brand,
      lowStockThresholdUnits: input.lowStockThresholdUnits,
    });
    await Promise.all(removedImageUrls.map((url) => deleteProductImage(url)));
    return NextResponse.json({ ok: true });
  }

  const rowsWithDerivedId = input.variants.map((row) => ({
    ...row,
    variantId: `${row.type}-${row.sizeMl}ml`,
  }));

  const derivedIds = new Set<string>();
  for (const row of rowsWithDerivedId) {
    if (derivedIds.has(row.variantId)) {
      return NextResponse.json(
        {
          error: `Two variants both resolve to ${formatVariantLabel(row.type, row.sizeMl)} — sizes must be unique per type.`,
        },
        { status: 400 },
      );
    }
    derivedIds.add(row.variantId);
  }

  // Variants no longer hold their own stock (they all draw from the
  // product's shared oilStockMl pool), so removing one is always safe —
  // there's nothing variant-specific to lose.
  const nextVariants: ProductVariant[] = rowsWithDerivedId.map((row) => ({
    variantId: row.variantId,
    type: row.type,
    sizeMl: row.sizeMl,
    priceInr: row.priceInr,
    mrpInr: row.mrpInr,
    oilMlPerUnit: row.oilMlPerUnit,
    isActive: row.isActive,
  }));

  await ref.update({
    name: input.name,
    description: input.description,
    notes: input.notes,
    category: input.category,
    imageUrls: input.imageUrls,
    isActive: input.isActive,
    lowStockThresholdMl: input.lowStockThresholdMl,
    variants: nextVariants,
  });
  await Promise.all(removedImageUrls.map((url) => deleteProductImage(url)));

  return NextResponse.json({ ok: true });
}

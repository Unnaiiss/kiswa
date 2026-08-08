import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { productsCollection } from "@/lib/firestore/admin-collections";
import { computeVariantPrices } from "@/lib/pricing";
import { slugify } from "@/lib/slugify";
import { AuthError, requireRole } from "@/lib/server/authGuard";
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
  isActive: z.boolean().default(true),
};

const createAttarSchema = z.object({
  productType: z.literal("attar"),
  ...baseFields,
  basePrice: z.number().nonnegative(),
});

const createImportedSchema = z.object({
  productType: z.literal("imported"),
  ...baseFields,
  priceInr: z.number().nonnegative(),
  mrpInr: z.number().nonnegative(),
  sizeLabel: z.string().trim().min(1, "Size label is required"),
  brand: z.string().trim().nullable().default(null),
  lowStockThresholdUnits: z.number().int().nonnegative().default(2),
});

const createProductSchema = z.discriminatedUnion("productType", [
  createAttarSchema,
  createImportedSchema,
]);

export async function POST(request: Request) {
  try {
    await requireRole(request, ["admin"]);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const json = await request.json().catch(() => null);
  const parsed = createProductSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const slug = slugify(input.name);
  if (!slug) {
    return NextResponse.json(
      { error: "Product name must contain at least one letter or number" },
      { status: 400 },
    );
  }

  const ref = productsCollection().doc(slug);

  try {
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists) {
        throw new Error("DUPLICATE_SLUG");
      }

      if (input.productType === "imported") {
        tx.set(ref, {
          productType: "imported",
          name: input.name,
          slug,
          description: input.description,
          notes: input.notes,
          category: input.category,
          imageUrls: input.imageUrls,
          isActive: input.isActive,
          priceInr: input.priceInr,
          mrpInr: input.mrpInr,
          sizeLabel: input.sizeLabel,
          brand: input.brand,
          unitStock: 0,
          lowStockThresholdUnits: input.lowStockThresholdUnits,
          createdAt: FieldValue.serverTimestamp(),
        });
        return;
      }

      const computed = computeVariantPrices(input.basePrice);
      const variants: ProductVariant[] = computed.map((c) => ({
        variantId: c.variantId,
        type: c.type,
        sizeMl: c.sizeMl,
        priceInr: c.priceInr,
        mrpInr: c.mrpInr,
        oilMlPerUnit: c.oilMlPerUnit,
        isActive: input.isActive,
      }));

      tx.set(ref, {
        productType: "attar",
        name: input.name,
        slug,
        description: input.description,
        notes: input.notes,
        category: input.category,
        imageUrls: input.imageUrls,
        isActive: input.isActive,
        variants,
        oilStockMl: 0,
        lowStockThresholdMl: 10,
        createdAt: FieldValue.serverTimestamp(),
      });
    });
  } catch (err) {
    if (err instanceof Error && err.message === "DUPLICATE_SLUG") {
      return NextResponse.json(
        { error: `A product named "${input.name}" already exists.` },
        { status: 409 },
      );
    }
    throw err;
  }

  return NextResponse.json({ id: slug });
}

import { z } from "zod";
import { productsCollection } from "@/lib/firestore/admin-collections";
import { computeOriginalPriceInr } from "@/lib/combos";
import { formatVariantLabel } from "@/lib/pricing";
import type {
  ComboEligibleVariant,
  ComboFixedItem,
  ComboType,
  ProductDoc,
} from "@/lib/firestore/types";

export class ComboValidationError extends Error {}

const fixedItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1),
  qty: z.number().int().positive(),
});

const eligibleVariantSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1),
});

export const comboFieldsSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug must be lowercase letters, numbers, and hyphens"),
  description: z.string().trim().default(""),
  comboPriceInr: z.coerce.number().positive("Combo price must be greater than 0"),
  type: z.enum(["fixed", "choose-any"]),
  itemsJson: z.string().default("[]"),
  chooseCount: z.coerce.number().int().positive().optional(),
  eligibleVariantsJson: z.string().default("[]"),
  isActive: z.enum(["true", "false"]),
  order: z.coerce.number().int().nonnegative(),
  validFrom: z.string().trim().optional(),
  validUntil: z.string().trim().optional(),
  badgeText: z.string().trim().optional(),
});

export interface ResolvedComboFields {
  title: string;
  slug: string;
  description: string;
  comboPriceInr: number;
  originalPriceInr: number;
  type: ComboType;
  items: ComboFixedItem[];
  chooseCount: number | null;
  eligibleVariants: ComboEligibleVariant[];
  isActive: boolean;
  order: number;
  validFrom: Date | null;
  validUntil: Date | null;
  badgeText: string | null;
}

/** Validates and normalizes a combo form submission, re-deriving every
 * product/variant name, label, and price fresh from live product data —
 * never trusting the client's own snapshots for anything money- or
 * stock-related (the admin form only uses them to preview live). */
export async function resolveComboFields(
  input: z.infer<typeof comboFieldsSchema>,
): Promise<ResolvedComboFields> {
  let rawItems: unknown;
  let rawEligible: unknown;
  try {
    rawItems = JSON.parse(input.itemsJson);
    rawEligible = JSON.parse(input.eligibleVariantsJson);
  } catch {
    throw new ComboValidationError("Invalid combo contents");
  }
  const itemsParsed = z.array(fixedItemSchema).safeParse(rawItems);
  const eligibleParsed = z.array(eligibleVariantSchema).safeParse(rawEligible);
  if (!itemsParsed.success || !eligibleParsed.success) {
    throw new ComboValidationError("Invalid combo contents");
  }

  if (input.type === "fixed" && itemsParsed.data.length === 0) {
    throw new ComboValidationError("Add at least one item to a fixed combo");
  }
  if (input.type === "choose-any") {
    if (eligibleParsed.data.length === 0) {
      throw new ComboValidationError("Add at least one eligible variant");
    }
    if (!input.chooseCount || input.chooseCount < 1) {
      throw new ComboValidationError("Choose count must be at least 1");
    }
    if (input.chooseCount > eligibleParsed.data.length) {
      throw new ComboValidationError(
        "Choose count can't be more than the number of eligible variants",
      );
    }
  }

  const productIds = [
    ...new Set([
      ...itemsParsed.data.map((i) => i.productId),
      ...eligibleParsed.data.map((i) => i.productId),
    ]),
  ];
  const products = productsCollection();
  const productSnaps = await Promise.all(
    productIds.map((id) => products.doc(id).get()),
  );
  const productMap = new Map<string, ProductDoc>();
  productSnaps.forEach((snap, idx) => {
    const data = snap.data();
    if (snap.exists && data) productMap.set(productIds[idx], data);
  });

  function resolveVariant(productId: string, variantId: string) {
    const product = productMap.get(productId);
    const variant = product?.variants.find((v) => v.variantId === variantId);
    if (!product || !variant) {
      throw new ComboValidationError("A selected product/variant no longer exists");
    }
    return { product, variant };
  }

  const items: ComboFixedItem[] = itemsParsed.data.map((i) => {
    const { product, variant } = resolveVariant(i.productId, i.variantId);
    return {
      productId: i.productId,
      variantId: i.variantId,
      productName: product.name,
      variantLabel: formatVariantLabel(variant.type, variant.sizeMl),
      qty: i.qty,
    };
  });
  const eligibleVariants: ComboEligibleVariant[] = eligibleParsed.data.map((i) => {
    const { product, variant } = resolveVariant(i.productId, i.variantId);
    return {
      productId: i.productId,
      variantId: i.variantId,
      productName: product.name,
      variantLabel: formatVariantLabel(variant.type, variant.sizeMl),
    };
  });

  const originalPriceInr = computeOriginalPriceInr(
    input.type,
    items,
    input.chooseCount ?? 0,
    eligibleVariants,
    productMap,
  );

  const validFrom = input.validFrom ? new Date(input.validFrom) : null;
  const validUntil = input.validUntil ? new Date(input.validUntil) : null;
  if (validFrom && Number.isNaN(validFrom.getTime())) {
    throw new ComboValidationError("Invalid start date");
  }
  if (validUntil && Number.isNaN(validUntil.getTime())) {
    throw new ComboValidationError("Invalid end date");
  }
  if (validFrom && validUntil && validFrom > validUntil) {
    throw new ComboValidationError("Start date must be before end date");
  }

  return {
    title: input.title,
    slug: input.slug,
    description: input.description,
    comboPriceInr: input.comboPriceInr,
    originalPriceInr,
    type: input.type,
    items: input.type === "fixed" ? items : [],
    chooseCount: input.type === "choose-any" ? (input.chooseCount ?? null) : null,
    eligibleVariants: input.type === "choose-any" ? eligibleVariants : [],
    isActive: input.isActive === "true",
    order: input.order,
    validFrom,
    validUntil,
    badgeText: input.badgeText?.trim() || null,
  };
}

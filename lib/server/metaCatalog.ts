import { productsCollection } from "@/lib/firestore/admin-collections";
import { metaCatalogId, IMPORTED_VARIANT_ID } from "@/lib/products";
import { getImageDimensions } from "./imageDimensions";
import type { Product, VariantType } from "@/lib/firestore/types";

/**
 * Meta commerce catalog CSV — shared by the admin export button
 * (app/api/admin/products/export-meta-catalog/route.ts) and the public
 * scheduled-feed URL (app/api/feeds/meta-catalog.csv/route.ts), so the two
 * can never drift. One row per active, priced VARIANT (not per product) —
 * every id here is built via lib/products.ts's metaCatalogId, the EXACT
 * same function every Meta Pixel ecommerce event call site uses for its
 * own content_ids, since Meta's dynamic ads match a pixel event back to a
 * catalog row by string equality on that id.
 */

export const CATALOG_COLUMNS = [
  "id",
  "title",
  "description",
  "availability",
  "condition",
  "price",
  "link",
  "image_link",
  "brand",
  "google_product_category",
  "fb_product_category",
  "quantity_to_sell_on_facebook",
  "sale_price",
  "item_group_id",
  "gender",
  "color",
  "size",
  "age_group",
  "material",
  "product_tags[0]",
  "product_tags[1]",
] as const;

type CatalogColumn = (typeof CATALOG_COLUMNS)[number];
type CatalogFields = Record<CatalogColumn, string>;

export interface SkippedEntry {
  productId: string;
  productName: string;
  variantId?: string;
  reason: string;
}

export interface ImageWarning {
  productId: string;
  productName: string;
  url: string;
  reason: string;
}

export interface MetaCatalogResult {
  rows: string[][];
  count: number;
  skipped: SkippedEntry[];
  imageWarnings: ImageWarning[];
}

const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "") || "https://kiswaperfumes.in";

// Meta requires ≥500x500; below that a listing can be rejected or shown
// blurry. Fixed per this task's spec, not admin-configurable.
const MIN_IMAGE_DIMENSION = 500;

const GOOGLE_PRODUCT_CATEGORY = "Health & Beauty > Personal Care > Cosmetics > Perfume & Cologne";

// fb_product_category, color, and material aren't described anywhere in
// this catalog's spec and this app tracks no data for any of them (no
// per-product color/material field exists) — left blank on every row
// rather than guessing a value, all three are optional per Meta's own
// catalog spec when google_product_category is present.
const TYPE_LABEL: Record<VariantType, string> = {
  oil: "Perfume Oil",
  spray: "Perfume Spray",
};

function money(amountInr: number): string {
  return `${amountInr.toFixed(2)} INR`;
}

function plainText(input: string): string {
  return input
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildDescription(description: string, notes: string[]): string {
  const base = plainText(description);
  if (notes.length === 0) return base;
  return `${base} Notes: ${notes.join(", ")}.`.trim();
}

function resolveUrl(url: string): string {
  try {
    return new URL(url, SITE_URL).toString();
  } catch {
    return url;
  }
}

function buildRow(fields: CatalogFields): string[] {
  return CATALOG_COLUMNS.map((col) => fields[col]);
}

async function checkImage(
  originalUrl: string,
  productId: string,
  productName: string,
  warnings: ImageWarning[],
): Promise<void> {
  if (!/^https?:\/\//i.test(originalUrl)) {
    warnings.push({
      productId,
      productName,
      url: originalUrl,
      reason: "Local path, not a public URL — Meta's crawler needs a fully absolute https:// URL",
    });
  }

  const resolved = resolveUrl(originalUrl);
  try {
    const res = await fetch(resolved);
    if (!res.ok) {
      warnings.push({
        productId,
        productName,
        url: resolved,
        reason: `Image fetch failed (HTTP ${res.status})`,
      });
      return;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const dims = getImageDimensions(buf);
    if (!dims) {
      warnings.push({
        productId,
        productName,
        url: resolved,
        reason: "Could not determine image dimensions (unrecognized format)",
      });
      return;
    }
    if (dims.width < MIN_IMAGE_DIMENSION || dims.height < MIN_IMAGE_DIMENSION) {
      warnings.push({
        productId,
        productName,
        url: resolved,
        reason: `Image is ${dims.width}x${dims.height}, below Meta's ${MIN_IMAGE_DIMENSION}x${MIN_IMAGE_DIMENSION} minimum`,
      });
    }
  } catch (err) {
    warnings.push({
      productId,
      productName,
      url: resolved,
      reason: `Image fetch error: ${(err as Error).message}`,
    });
  }
}

export async function buildMetaCatalog(): Promise<MetaCatalogResult> {
  const snap = await productsCollection().get();
  const skipped: SkippedEntry[] = [];
  const imageWarnings: ImageWarning[] = [];
  const rows: string[][] = [];
  const checkedImageUrls = new Set<string>();

  for (const doc of snap.docs) {
    const product = { id: doc.id, ...doc.data() } as Product;

    if (!product.isActive) {
      skipped.push({ productId: product.id, productName: product.name, reason: "product inactive" });
      continue;
    }

    const primaryImage = product.imageUrls[0];
    if (!primaryImage) {
      imageWarnings.push({
        productId: product.id,
        productName: product.name,
        url: "",
        reason: "No product image set",
      });
    } else if (!checkedImageUrls.has(primaryImage)) {
      checkedImageUrls.add(primaryImage);
      await checkImage(primaryImage, product.id, product.name, imageWarnings);
    }
    const imageLink = primaryImage ? resolveUrl(primaryImage) : "";
    const description = buildDescription(product.description, product.notes);

    if (product.productType === "attar") {
      for (const variant of product.variants) {
        if (!variant.isActive) {
          skipped.push({
            productId: product.id,
            productName: product.name,
            variantId: variant.variantId,
            reason: "variant inactive",
          });
          continue;
        }
        if (variant.mrpInr <= 0) {
          skipped.push({
            productId: product.id,
            productName: product.name,
            variantId: variant.variantId,
            reason: "price is 0",
          });
          continue;
        }

        const availability = product.oilStockMl >= variant.oilMlPerUnit ? "in stock" : "out of stock";
        const quantity = Math.max(0, Math.floor(product.oilStockMl / variant.oilMlPerUnit));
        const typeLabel = TYPE_LABEL[variant.type];

        rows.push(
          buildRow({
            id: metaCatalogId(product.id, variant.variantId),
            title: `${product.name} — ${typeLabel} ${variant.sizeMl}ml`,
            description,
            availability,
            condition: "new",
            price: money(variant.mrpInr),
            link: `${SITE_URL}/product/${product.slug}?variant=${variant.variantId}`,
            image_link: imageLink,
            brand: "KISWA",
            google_product_category: GOOGLE_PRODUCT_CATEGORY,
            fb_product_category: "",
            quantity_to_sell_on_facebook: String(quantity),
            sale_price: variant.priceInr < variant.mrpInr ? money(variant.priceInr) : "",
            item_group_id: product.id,
            gender: "unisex",
            color: "",
            size: `${variant.sizeMl}ml`,
            age_group: "adult",
            material: "",
            "product_tags[0]": typeLabel,
            "product_tags[1]": product.category,
          }),
        );
      }
    } else {
      if (product.mrpInr <= 0 || product.priceInr <= 0) {
        skipped.push({ productId: product.id, productName: product.name, reason: "price is 0" });
        continue;
      }

      const availability = product.unitStock > 0 ? "in stock" : "out of stock";
      const quantity = Math.max(0, Math.floor(product.unitStock));

      rows.push(
        buildRow({
          id: metaCatalogId(product.id, IMPORTED_VARIANT_ID),
          title: `${product.name} — ${product.sizeLabel}`,
          description,
          availability,
          condition: "new",
          price: money(product.mrpInr),
          link: `${SITE_URL}/product/${product.slug}?variant=${IMPORTED_VARIANT_ID}`,
          image_link: imageLink,
          brand: product.brand || "KISWA",
          google_product_category: GOOGLE_PRODUCT_CATEGORY,
          fb_product_category: "",
          quantity_to_sell_on_facebook: String(quantity),
          sale_price: product.priceInr < product.mrpInr ? money(product.priceInr) : "",
          item_group_id: product.id,
          gender: "unisex",
          color: "",
          size: product.sizeLabel,
          age_group: "adult",
          material: "",
          "product_tags[0]": "Imported",
          "product_tags[1]": product.category,
        }),
      );
    }
  }

  return { rows, count: rows.length, skipped, imageWarnings };
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function catalogRowsToCsv(rows: string[][]): string {
  const lines = [CATALOG_COLUMNS.join(",")];
  for (const row of rows) {
    lines.push(row.map(csvCell).join(","));
  }
  return lines.join("\r\n");
}

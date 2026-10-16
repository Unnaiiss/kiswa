/**
 * KISWA -> Meta (Facebook/Instagram) Commerce catalog CSV exporter
 *
 * Run from the root of the kiswa-web project:
 *   npm i firebase-admin
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/export-meta-catalog.mjs
 *
 * Output: catalog_products.csv  (upload in Commerce Manager > Catalog > Data sources)
 */

import fs from "node:fs";
import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

/* ----------------------------- CONFIG ----------------------------- */
const CONFIG = {
  siteUrl: "https://kiswaperfumes.in",
  productPath: "/products",          // -> https://kiswaperfumes.in/products/<slug>
  brand: "KISWA",
  currency: "INR",
  collection: "products",            // Firestore collection name
  importedCollection: "importedPerfumes", // set to null if you don't have one
  outFile: "catalog_products.csv",

  // Field names in your Firestore docs — edit if yours differ
  fields: {
    name: "name",
    slug: "slug",
    description: "description",
    notes: "notes",                  // {top, heart, base} or string
    images: "images",                // string[] of absolute URLs
    variants: "variants",            // [{type:'oil'|'spray', size:3, price:250, stock:12, sku:'...'}]
    variantType: "type",
    variantSize: "size",
    variantPrice: "price",
    variantStock: "stock",
    variantSku: "sku",
    active: "active",
  },

  googleCategory: "Health & Beauty > Personal Care > Cosmetics > Perfume & Cologne",
  fbCategory: "",                    // optional, safe to leave blank
  shipping: "IN::Standard:0.0 INR",  // free shipping overlay; edit if you charge
};
/* ------------------------------------------------------------------ */

const HEADERS = ["id","title","description","availability","condition","price","link","image_link","brand","google_product_category","fb_product_category","quantity_to_sell_on_facebook","sale_price","sale_price_effective_date","item_group_id","gender","color","size","age_group","material","pattern","shipping","shipping_weight","offer_disclaimer","offer_disclaimer_url","video[0].url","video[0].tag[0]","gtin","product_tags[0]","product_tags[1]","style[0]"];

initializeApp(
  process.env.GOOGLE_APPLICATION_CREDENTIALS
    ? { credential: applicationDefault() }
    : { credential: cert(JSON.parse(fs.readFileSync("./serviceAccountKey.json", "utf8"))) }
);
const db = getFirestore();

const F = CONFIG.fields;
const slugify = (s) => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const money = (n) => `${Number(n).toFixed(2)} ${CONFIG.currency}`;
const csvCell = (v) => {
  const s = v === undefined || v === null ? "" : String(v).replace(/\r?\n/g, " ").trim();
  return /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function notesText(notes) {
  if (!notes) return "";
  if (typeof notes === "string") return notes;
  const parts = [];
  if (notes.top) parts.push(`Top: ${[].concat(notes.top).join(", ")}`);
  if (notes.heart || notes.middle) parts.push(`Heart: ${[].concat(notes.heart || notes.middle).join(", ")}`);
  if (notes.base) parts.push(`Base: ${[].concat(notes.base).join(", ")}`);
  return parts.join(". ");
}

function buildDescription(p, v) {
  const kind = v.type === "spray" ? "perfume spray" : "perfume oil (attar)";
  const base = p[F.description] || `${p[F.name]} by KISWA, a long lasting ${kind} in a ${v.size}ml bottle.`;
  const n = notesText(p[F.notes]);
  const tail = v.type === "spray"
    ? "Alcohol based spray for easy everyday wear."
    : "Concentrated, non alcoholic attar oil that stays on the skin for hours.";
  return [base, n, tail].filter(Boolean).join(" ").slice(0, 9000);
}

function rowsForProduct(doc, { imported = false } = {}) {
  const p = doc.data();
  if (p[F.active] === false) return [];
  const slug = p[F.slug] || slugify(p[F.name] || doc.id);
  const images = Array.isArray(p[F.images]) ? p[F.images] : [];
  const groupId = `KSW-${slugify(p[F.name] || doc.id).toUpperCase()}`;

  const variants = imported
    ? [{ type: "spray", size: p.size || 100, price: p.price, stock: p.stock, sku: p.sku }]
    : (Array.isArray(p[F.variants]) ? p[F.variants] : []);

  return variants
    .filter((v) => v && v[F.variantPrice] != null)
    .map((v) => {
      const type = (v[F.variantType] || "oil").toLowerCase();
      const size = v[F.variantSize];
      const stock = Number(v[F.variantStock] ?? 0);
      const label = type === "spray" ? "Perfume Spray" : "Perfume Oil (Attar)";
      const id = v[F.variantSku] || `${groupId}-${type.toUpperCase()}-${size}ML`;
      const image = images[type === "spray" ? Math.min(2, images.length - 1) : 0] || images[0] || "";

      return {
        id,
        title: `${CONFIG.brand} ${p[F.name]} ${label} – ${size}ml`.slice(0, 200),
        description: buildDescription(p, { type, size }),
        availability: stock > 0 ? "in stock" : "out of stock",
        condition: "new",
        price: money(v[F.variantPrice]),
        link: `${CONFIG.siteUrl}${CONFIG.productPath}/${slug}?variant=${type}-${size}ml`,
        image_link: image,
        brand: imported ? (p.brand || CONFIG.brand) : CONFIG.brand,
        google_product_category: CONFIG.googleCategory,
        fb_product_category: CONFIG.fbCategory,
        quantity_to_sell_on_facebook: Math.max(stock, 0),
        sale_price: v.salePrice != null ? money(v.salePrice) : "",
        sale_price_effective_date: "",
        item_group_id: groupId,
        gender: "unisex",
        color: "",
        size: `${size} ml`,
        age_group: "adult",
        material: "",
        pattern: "",
        shipping: CONFIG.shipping,
        shipping_weight: `${type === "spray" ? size + 60 : size + 25} g`,
        offer_disclaimer: "",
        offer_disclaimer_url: "",
        "video[0].url": "",
        "video[0].tag[0]": "",
        gtin: "",
        "product_tags[0]": type === "spray" ? "perfume spray" : "attar",
        "product_tags[1]": "arabic perfume",
        "style[0]": "",
      };
    });
}

const rows = [];
const snap = await db.collection(CONFIG.collection).get();
snap.forEach((d) => rows.push(...rowsForProduct(d)));

if (CONFIG.importedCollection) {
  try {
    const isnap = await db.collection(CONFIG.importedCollection).get();
    isnap.forEach((d) => rows.push(...rowsForProduct(d, { imported: true })));
  } catch { /* collection not present — skip */ }
}

const csv = [HEADERS.join(",")]
  .concat(rows.map((r) => HEADERS.map((h) => csvCell(r[h])).join(",")))
  .join("\n");

fs.writeFileSync(CONFIG.outFile, "\uFEFF" + csv, "utf8");
console.log(`Wrote ${rows.length} rows to ${CONFIG.outFile}`);

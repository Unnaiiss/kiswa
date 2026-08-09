import type { MetadataRoute } from "next";
import { getActiveCombos, getActiveProducts } from "@/lib/store/queries";

// Same pattern as app/layout.tsx's SITE_URL / lib/whatsapp.ts's site-url
// fallback — NEXT_PUBLIC_SITE_URL must be set in production for this to
// emit correct absolute URLs (Next.js's sitemap spec requires them).
const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "") || "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/offers`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/gift`, changeFrequency: "weekly", priority: 0.6 },
  ];

  // getActiveProducts/getActiveCombos already degrade to [] on a Firestore
  // read failure (see lib/store/queries.ts's safeRead) rather than
  // throwing, so a transient hiccup here means "static routes only", never
  // a failed build/request.
  const [products, combos] = await Promise.all([getActiveProducts(), getActiveCombos()]);

  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${SITE_URL}/product/${product.slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const comboRoutes: MetadataRoute.Sitemap = combos.map((combo) => ({
    url: `${SITE_URL}/offers/${combo.slug}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...productRoutes, ...comboRoutes];
}

import type { MetadataRoute } from "next";

const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "") || "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /pos and /admin are session-gated server-side regardless (see
        // app/pos/page.tsx, app/admin/layout.tsx) — disallowing them here
        // is just about keeping them out of search results, not security.
        disallow: ["/pos", "/admin", "/checkout", "/login", "/account"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

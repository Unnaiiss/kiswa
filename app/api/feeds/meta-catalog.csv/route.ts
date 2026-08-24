import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/server/rateLimit";
import { buildMetaCatalog, catalogRowsToCsv } from "@/lib/server/metaCatalog";

/**
 * Public, unauthenticated CSV feed for Meta Commerce Manager's own
 * scheduled-fetch feature — set this exact URL up there once and it stays
 * in sync automatically, no manual re-upload. Shares lib/server/
 * metaCatalog.ts with the admin export button (app/api/admin/products/
 * export-meta-catalog/route.ts) so the two can never disagree.
 *
 * revalidate=3600 makes Next.js cache this route handler's response for an
 * hour (ISR for Route Handlers) — the catalog build does a live image
 * dimension fetch per unique product image, which isn't cheap to redo on
 * every crawl; an hour-stale stock/price snapshot is an acceptable
 * trade-off for a feed Meta itself only re-pulls periodically anyway.
 * Cache-Control mirrors that so any CDN in front of this agrees.
 */
export const revalidate = 3600;

export async function GET(request: Request) {
  const limited = rateLimit(request, "feeds:meta-catalog", {
    limit: 30,
    windowMs: 10 * 60 * 1000,
  });
  if (limited) return limited;

  const { rows, skipped, imageWarnings } = await buildMetaCatalog();
  const csv = catalogRowsToCsv(rows);

  // Server-side visibility into skipped rows/image problems without
  // needing a separate admin UI round trip — same "log what got silently
  // excluded" philosophy as the combo-banner/announcement-bar exclusions
  // elsewhere in this app.
  if (skipped.length > 0 || imageWarnings.length > 0) {
    console.warn(
      `[meta-catalog feed] ${skipped.length} row(s) skipped, ${imageWarnings.length} image warning(s)`,
      { skipped, imageWarnings },
    );
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=600",
    },
  });
}

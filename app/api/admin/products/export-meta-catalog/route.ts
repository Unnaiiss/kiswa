import { NextResponse } from "next/server";
import { AuthError, requireRole } from "@/lib/server/authGuard";
import { buildMetaCatalog, catalogRowsToCsv } from "@/lib/server/metaCatalog";

/**
 * Admin → Products' "Export Meta Catalog (CSV)" button. Returns JSON (not
 * a raw CSV response) so adminFetch's existing res.json() contract keeps
 * working like every other admin route, and so the admin UI can also show
 * the skipped-products/image-warning diagnostics inline — the CSV text
 * itself is handed to the same lib/admin/csv.ts's downloadCsv() every
 * other export button on this app already uses to trigger the actual file
 * download client-side. The public, unauthenticated equivalent (a live
 * feed URL for Meta Commerce Manager's scheduled fetch) is
 * app/api/feeds/meta-catalog.csv/route.ts — both call the exact same
 * lib/server/metaCatalog.ts so they can never drift from each other.
 */
export async function GET(request: Request) {
  try {
    await requireRole(request, ["admin"]);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const { rows, count, skipped, imageWarnings } = await buildMetaCatalog();
  const csv = catalogRowsToCsv(rows);

  return NextResponse.json({ csv, count, skipped, imageWarnings });
}

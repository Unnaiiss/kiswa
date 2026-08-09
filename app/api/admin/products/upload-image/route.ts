import { NextResponse } from "next/server";
import { AuthError, requireRole } from "@/lib/server/authGuard";
import { saveProductImage } from "@/lib/server/productImages";
import { rateLimit } from "@/lib/server/rateLimit";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Uploads a single product gallery image, returning its URL. The product
 * create/edit form calls this once per file (so each thumbnail can show
 * progress and appear independently) and collects the returned URLs into
 * its imageUrls array — the actual product POST/PATCH never touches files
 * directly, just the final array of URLs (uploaded or pasted). */
export async function POST(request: Request) {
  try {
    await requireRole(request, ["admin"]);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  // A gallery edit posts one file per image in quick succession (see
  // components/admin/products/image-uploader.tsx), so this is deliberately
  // generous — it's guarding against runaway/scripted abuse, not normal use.
  const limited = rateLimit(request, "admin:upload-image", {
    limit: 60,
    windowMs: 10 * 60 * 1000,
  });
  if (limited) return limited;

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No image file was received" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Only JPG, PNG, or WEBP images are allowed" },
      { status: 400 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Image must be 5MB or smaller" },
      { status: 400 },
    );
  }

  const url = await saveProductImage(file);
  return NextResponse.json({ url });
}

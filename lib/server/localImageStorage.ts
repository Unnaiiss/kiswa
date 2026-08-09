import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const ALLOWED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

/** Enforced for every upload through this module — see saveUploadedImage.
 * The product-upload route (app/api/admin/products/upload-image/route.ts)
 * also pre-checks these same limits before calling saveProductImage for a
 * faster/friendlier rejection; the banner/combo routes had no such
 * pre-check, which is exactly the gap this shared enforcement closes (they
 * were accepting uploads of any size/type before writing straight to
 * /public — see storage evidence of several 5-8MB banner PNGs on disk). */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ALLOWED_UPLOAD_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Thrown for a rejected upload (too large, wrong type, empty) — callers
 * should catch this and return a 400 with its message, distinct from an
 * unexpected server error. */
export class InvalidImageUploadError extends Error {}

/**
 * Shared local-filesystem upload mechanism for every admin image upload
 * (banners, combos, product galleries) — uploads land in /public/<subdir>
 * rather than Firebase Storage, since this project has no Storage bucket
 * wired up (no storage.rules, no client/admin Storage SDK usage anywhere),
 * so it isn't "already configured" per CLAUDE.md. This only persists on a
 * traditional Node server with a writable filesystem; a serverless/edge
 * deploy (e.g. Vercel) would need Firebase Storage instead since its
 * filesystem is read-only at runtime.
 *
 * Every caller shares this one function rather than reimplementing the
 * write — see lib/server/bannerImages.ts and lib/server/productImages.ts
 * for the per-feature subdir wrappers. Validating size/type here (rather
 * than leaving it to each route) guarantees every current and future
 * upload path gets the same limits with no chance of a route forgetting to
 * check.
 */
export async function saveUploadedImage(file: File, subdir: string): Promise<string> {
  if (file.size === 0) {
    throw new InvalidImageUploadError("No image file was received");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new InvalidImageUploadError("Image must be 5MB or smaller");
  }
  if (!ALLOWED_UPLOAD_MIME_TYPES.has(file.type)) {
    throw new InvalidImageUploadError("Only JPG, PNG, or WEBP images are allowed");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name).toLowerCase();
  const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : ".jpg";
  const filename = `${randomUUID()}${safeExt}`;
  const dir = path.join(process.cwd(), "public", subdir);

  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);

  return `/${subdir}/${filename}`;
}

/** Best-effort cleanup — never throws, since a stale file is harmless. Only
 * deletes URLs under the given subdir, so a pasted external URL (never
 * something we wrote) is never touched. */
export async function deleteUploadedImage(
  imageUrl: string | null | undefined,
  subdir: string,
) {
  if (!imageUrl || !imageUrl.startsWith(`/${subdir}/`)) return;
  try {
    await unlink(path.join(process.cwd(), "public", imageUrl));
  } catch {
    // File already gone or never existed on disk — nothing to do.
  }
}

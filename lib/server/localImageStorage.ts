import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const ALLOWED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

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
 * for the per-feature subdir wrappers.
 */
export async function saveUploadedImage(file: File, subdir: string): Promise<string> {
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

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const ALLOWED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const BANNERS_DIR = path.join(process.cwd(), "public", "banners");

/**
 * Uploads land in /public/banners rather than Firebase Storage — this
 * project has no Storage bucket wired up (no storage.rules, no client/admin
 * Storage SDK usage anywhere), so it isn't "already configured" per
 * CLAUDE.md. This only persists on a traditional Node server with a
 * writable filesystem; a serverless/edge deploy (e.g. Vercel) would need
 * Firebase Storage instead since its filesystem is read-only at runtime.
 */
export async function saveBannerImage(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name).toLowerCase();
  const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : ".jpg";
  const filename = `${randomUUID()}${safeExt}`;

  await mkdir(BANNERS_DIR, { recursive: true });
  await writeFile(path.join(BANNERS_DIR, filename), buffer);

  return `/banners/${filename}`;
}

/** Best-effort cleanup — never throws, since a stale file is harmless. */
export async function deleteBannerImage(imageUrl: string | null | undefined) {
  if (!imageUrl || !imageUrl.startsWith("/banners/")) return;
  try {
    await unlink(path.join(process.cwd(), "public", imageUrl));
  } catch {
    // File already gone or never existed on disk — nothing to do.
  }
}

import { randomUUID } from "node:crypto";
import path from "node:path";
import { getStorage } from "firebase-admin/storage";
import { adminApp } from "@/lib/firebase/admin";

const ALLOWED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

/** Enforced for every upload through this module — see saveUploadedImage. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ALLOWED_UPLOAD_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Thrown for a rejected upload (too large, wrong type, empty) — callers
 * should catch this and return a 400 with its message, distinct from an
 * unexpected server error. */
export class InvalidImageUploadError extends Error {}

const BUCKET_NAME = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();

/** Every URL this module hands out starts with this — a raw
 * storage.googleapis.com/<bucket>/<path> URL is governed by GCS bucket/
 * object ACLs, NOT by storage.rules (a common mix-up), and isn't public by
 * default. The Firebase-standard way to get a permanent public URL without
 * touching bucket ACLs is this REST download-URL shape with an embedded
 * access token in the object's own metadata — the same thing the client
 * SDK's getDownloadURL() constructs. A valid token bypasses storage.rules
 * entirely (same principle as every Firestore write here already going
 * through firebase-admin, which bypasses Firestore rules), so rules stay
 * deny-all and are simply never the path this traffic goes through. */
function downloadUrl(objectPath: string, token: string): string {
  if (!BUCKET_NAME) {
    throw new Error("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET env var is not set");
  }
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`;
}

/** Recovers the storage object path from a URL this module previously
 * returned — used by deleteUploadedImage. Returns null for anything that
 * isn't one of ours (e.g. a supplier-pasted external URL). */
function objectPathFromUrl(imageUrl: string): string | null {
  if (!BUCKET_NAME) return null;
  const prefix = `https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o/`;
  if (!imageUrl.startsWith(prefix)) return null;
  const encoded = imageUrl.slice(prefix.length).split("?")[0];
  try {
    return decodeURIComponent(encoded);
  } catch {
    return null;
  }
}

function bucket() {
  if (!BUCKET_NAME) {
    throw new Error("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET env var is not set");
  }
  return getStorage(adminApp).bucket(BUCKET_NAME);
}

/**
 * Shared Firebase Storage upload mechanism for every admin image upload
 * (banners, combos, product galleries) — replaces the earlier local-
 * filesystem approach (writing to /public/<subdir> on the Node server's own
 * disk), which doesn't survive on serverless/edge hosts like Vercel, whose
 * filesystem is read-only at runtime and freshly rebuilt on every deploy.
 * Storage.rules grants public read on banners/** and products/** (writes
 * only ever happen through this firebase-admin call, which bypasses rules
 * entirely, same as every Firestore write in this app) — so the returned
 * URL is immediately, permanently servable with no signed-URL expiry to
 * manage.
 *
 * Every caller shares this one function rather than reimplementing the
 * write — see lib/server/bannerImages.ts and lib/server/productImages.ts
 * for the per-feature subdir wrappers.
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
  const objectPath = `${subdir}/${randomUUID()}${safeExt}`;
  const token = randomUUID();

  await bucket().file(objectPath).save(buffer, {
    metadata: {
      contentType: file.type,
      cacheControl: "public, max-age=31536000, immutable",
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });

  return downloadUrl(objectPath, token);
}

/** Best-effort cleanup — never throws, since a stale file is harmless. Only
 * deletes URLs that decode back to one of our own object paths under the
 * given subdir, so a pasted external URL (never something we wrote) is
 * never touched. */
export async function deleteUploadedImage(
  imageUrl: string | null | undefined,
  subdir: string,
) {
  if (!imageUrl) return;
  const objectPath = objectPathFromUrl(imageUrl);
  if (!objectPath || !objectPath.startsWith(`${subdir}/`)) return;
  try {
    await bucket().file(objectPath).delete();
  } catch {
    // File already gone or never existed — nothing to do.
  }
}

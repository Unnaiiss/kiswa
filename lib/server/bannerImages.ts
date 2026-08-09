import { deleteUploadedImage, saveUploadedImage } from "./imageStorage";

/** Banner/combo images — see lib/server/imageStorage.ts for the shared
 * upload mechanism these delegate to (one code path for every admin image
 * upload feature). */
export async function saveBannerImage(file: File): Promise<string> {
  return saveUploadedImage(file, "banners");
}

export async function deleteBannerImage(imageUrl: string | null | undefined) {
  return deleteUploadedImage(imageUrl, "banners");
}

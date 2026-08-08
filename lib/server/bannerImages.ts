import { deleteUploadedImage, saveUploadedImage } from "./localImageStorage";

/** Banner/combo images — see lib/server/localImageStorage.ts for the shared
 * upload mechanism these delegate to (one code path for every admin image
 * upload feature). */
export async function saveBannerImage(file: File): Promise<string> {
  return saveUploadedImage(file, "banners");
}

export async function deleteBannerImage(imageUrl: string | null | undefined) {
  return deleteUploadedImage(imageUrl, "banners");
}

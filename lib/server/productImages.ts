import { deleteUploadedImage, saveUploadedImage } from "./localImageStorage";

/** Product gallery images — see lib/server/localImageStorage.ts for the
 * shared upload mechanism this delegates to (same one banners/combos use). */
export async function saveProductImage(file: File): Promise<string> {
  return saveUploadedImage(file, "products");
}

export async function deleteProductImage(imageUrl: string | null | undefined) {
  return deleteUploadedImage(imageUrl, "products");
}

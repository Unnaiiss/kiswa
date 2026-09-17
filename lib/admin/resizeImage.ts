const MAX_DIMENSION = 1600;

/** Downscales to at most MAX_DIMENSION on the long edge (never upscales), so
 * the storefront doesn't ship full-resolution supplier/AI-generated photos —
 * shared by every admin image-upload form (product gallery, banners, combos,
 * home-section cards) so none of them can hit the server's 5MB cap on a raw
 * upload. PNGs stay PNG (may be a deliberate cutout with transparency);
 * everything else re-encodes as JPEG, which every browser's canvas can
 * produce reliably (unlike WEBP encoding, which isn't universally
 * supported). */
export function resizeImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      const longEdge = Math.max(width, height);
      if (longEdge > MAX_DIMENSION) {
        const scale = MAX_DIMENSION / longEdge;
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not process image"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Could not process image"))),
        outputType,
        0.86,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read image"));
    };
    img.src = objectUrl;
  });
}

/** resizeImage() returns a Blob (canvas.toBlob has no filename) — this
 * re-wraps it as a File under the original name so FormData fields still
 * see a normal filename instead of "blob". */
export async function resizeImageToFile(file: File): Promise<File> {
  const blob = await resizeImage(file);
  return new File([blob], file.name, { type: blob.type });
}

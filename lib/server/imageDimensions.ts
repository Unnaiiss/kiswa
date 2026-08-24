/**
 * Dependency-free width/height sniffing for the three formats this app's
 * own upload pipeline can ever produce (JPEG/PNG — see lib/server/
 * imageStorage.ts's ALLOWED_UPLOAD_MIME_TYPES) plus WebP, since an
 * admin-pasted external supplier image URL (also allowed) could be
 * anything. Used only by lib/server/metaCatalog.ts to flag undersized
 * catalog images — returns null (never throws) for a format it doesn't
 * recognize, so an unusual pasted image just skips the size check rather
 * than breaking the export.
 */
export interface ImageDimensions {
  width: number;
  height: number;
}

function readPng(buf: Buffer): ImageDimensions | null {
  // Signature (8 bytes) + IHDR chunk: 4-byte length, 4-byte "IHDR", then
  // 4-byte width, 4-byte height, big-endian.
  if (buf.length < 24) return null;
  const isPng =
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  if (!isPng) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function readJpeg(buf: Buffer): ImageDimensions | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buf[offset + 1];
    // SOFn markers (start of frame) carry the actual dimensions; skip
    // everything else (APPn/EXIF/comments/etc.) by its declared length.
    const isSof =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;
    const segmentLength = buf.readUInt16BE(offset + 2);
    if (isSof) {
      return {
        height: buf.readUInt16BE(offset + 5),
        width: buf.readUInt16BE(offset + 7),
      };
    }
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    offset += 2 + segmentLength;
  }
  return null;
}

function readWebp(buf: Buffer): ImageDimensions | null {
  if (buf.length < 30) return null;
  const isRiff = buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP";
  if (!isRiff) return null;
  const format = buf.toString("ascii", 12, 16);
  if (format === "VP8X") {
    // 24-bit little-endian width-minus-one / height-minus-one at fixed offsets.
    const width = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
    const height = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
    return { width, height };
  }
  if (format === "VP8 " && buf.length >= 30) {
    // Lossy VP8: 14-bit width/height (top 2 bits are scale, masked off) at a fixed offset.
    const width = buf.readUInt16LE(26) & 0x3fff;
    const height = buf.readUInt16LE(28) & 0x3fff;
    return { width, height };
  }
  if (format === "VP8L" && buf.length >= 25) {
    // Lossless VP8L: a packed 32-bit little-endian value starting after a
    // 1-byte signature (0x2f); width/height are 14 bits each, stored -1.
    const bits = buf.readUInt32LE(21);
    const width = 1 + (bits & 0x3fff);
    const height = 1 + ((bits >> 14) & 0x3fff);
    return { width, height };
  }
  return null;
}

export function getImageDimensions(buf: Buffer): ImageDimensions | null {
  return readPng(buf) ?? readJpeg(buf) ?? readWebp(buf);
}

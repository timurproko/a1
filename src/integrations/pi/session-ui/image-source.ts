import { ImageAttachmentError } from "../../../contracts/owned-ui/index.js";

export const MAX_SOURCE_IMAGE_BYTES = 20 * 1024 * 1024;
export const MAX_SOURCE_PIXELS = 40_000_000;
export const MAX_SOURCE_DIMENSION = 32_768;
export const IMAGE_PREPARATION_MS = 15_000;
export interface ImageSourceInfo {
  readonly width: number;
  readonly height: number;
  readonly mimeType: string;
  readonly orientation: number;
  readonly conversionUnsafe: boolean;
}

export function assertSourceBytes(length: number): void {
  if (length > MAX_SOURCE_IMAGE_BYTES) throw new ImageAttachmentError("image-source-size");
  if (!Number.isSafeInteger(length) || length <= 0) throw new ImageAttachmentError("image-data");
}

export function sourceImageInfo(bytes: Uint8Array, mimeType: string): ImageSourceInfo {
  assertSourceBytes(bytes.length);
  try {
    const info = readHeader(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength));
    if (info.mimeType !== mimeType.toLowerCase()) throw new ImageAttachmentError("image-mime");
    if (info.width <= 0 || info.height <= 0) throw new ImageAttachmentError("image-data");
    if (info.width > MAX_SOURCE_DIMENSION || info.height > MAX_SOURCE_DIMENSION || info.width * info.height > MAX_SOURCE_PIXELS) {
      throw new ImageAttachmentError("image-pixels");
    }
    return info;
  } catch (error) {
    if (error instanceof ImageAttachmentError) throw error;
    throw new ImageAttachmentError("image-data");
  }
}

function readHeader(b: Buffer): ImageSourceInfo {
  let orientation = 1;
  let conversionUnsafe = false;
  const info = (width: number, height: number, mimeType: string): ImageSourceInfo => ({ width, height, mimeType, orientation, conversionUnsafe });
  if (b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    if (b.toString("ascii", 12, 16) !== "IHDR" || b.readUInt32BE(8) !== 13) throw new ImageAttachmentError("image-data");
    for (let p = 8; p + 12 <= b.length;) {
      const n = b.readUInt32BE(p);
      if (p + n + 12 > b.length) throw new ImageAttachmentError("image-data");
      const type = b.toString("ascii", p + 4, p + 8);
      if (type === "eXIf") orientation = exifOrientation(b.subarray(p + 8, p + 8 + n));
      if (type === "acTL" || type === "iCCP" || (type === "IHDR" && b[p + 16] === 16)) conversionUnsafe = true;
      p += n + 12;
    }
    return info(b.readUInt32BE(16), b.readUInt32BE(20), "image/png");
  }
  if (b[0] === 255 && b[1] === 216) {
    let width = 0, height = 0;
    for (let p = 2; p < b.length;) {
      if (b[p++] !== 255) throw new ImageAttachmentError("image-data");
      while (b[p] === 255) p++;
      const marker = b[p++];
      if (marker === 218 || marker === 217) break;
      if (marker === 1 || (marker !== undefined && marker >= 208 && marker <= 215)) continue;
      const n = b.readUInt16BE(p);
      if (n < 2 || p + n > b.length) throw new ImageAttachmentError("image-data");
      if (marker === 225 && b.toString("ascii", p + 2, p + 8) === "Exif\0\0") orientation = exifOrientation(b.subarray(p + 8, p + n));
      if (marker === 226 && b.toString("ascii", p + 2, p + 13) === "ICC_PROFILE") conversionUnsafe = true;
      if (marker !== undefined && [192, 193, 194].includes(marker)) {
        height = b.readUInt16BE(p + 3); width = b.readUInt16BE(p + 5);
        if (b[p + 7] === 4) conversionUnsafe = true;
      }
      p += n;
    }
    return info(width, height, "image/jpeg");
  }
  if (/^GIF8[79]a$/.test(b.toString("ascii", 0, 6))) {
    conversionUnsafe = gifFrameCount(b) > 1;
    return info(b.readUInt16LE(6), b.readUInt16LE(8), "image/gif");
  }
  if (b.toString("ascii", 0, 2) === "BM") {
    const dib = b.readUInt32LE(14);
    if (dib === 12) return info(b.readUInt16LE(18), b.readUInt16LE(20), "image/bmp");
    if (dib < 40) throw new ImageAttachmentError("image-data");
    return info(b.readInt32LE(18), Math.abs(b.readInt32LE(22)), "image/bmp");
  }
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") {
    const kind = b.toString("ascii", 12, 16);
    if (kind === "VP8X") {
      conversionUnsafe = ((b[20] ?? 0) & 0x22) !== 0;
      for (let p = 12; p + 8 <= b.length;) {
        const n = b.readUInt32LE(p + 4);
        if (p + n + 8 > b.length) throw new ImageAttachmentError("image-data");
        if (b.toString("ascii", p, p + 4) === "EXIF") orientation = exifOrientation(b.subarray(p + 8, p + 8 + n));
        p += 8 + n + (n % 2);
      }
      return info(1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3), "image/webp");
    }
    if (kind === "VP8 " && b.toString("hex", 23, 26) === "9d012a") return info(b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff, "image/webp");
    if (kind === "VP8L" && b[20] === 47) {
      const bits = b.readUInt32LE(21);
      return info((bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1, "image/webp");
    }
  }
  throw new ImageAttachmentError("image-conversion");
}

function gifFrameCount(b: Buffer): number {
  let p = 13 + (((b[10] ?? 0) & 128) ? 3 * 2 ** (((b[10] ?? 0) & 7) + 1) : 0);
  let frames = 0;
  const skipBlocks = (): void => {
    while (p < b.length) {
      const length = b[p++] ?? 0;
      if (length === 0) return;
      p += length;
      if (p > b.length) throw new ImageAttachmentError("image-data");
    }
    throw new ImageAttachmentError("image-data");
  };
  while (p < b.length) {
    const marker = b[p++];
    if (marker === 59) return frames;
    if (marker === 33) { p++; skipBlocks(); continue; }
    if (marker !== 44 || p + 9 > b.length) throw new ImageAttachmentError("image-data");
    frames++;
    const packed = b[p + 8] ?? 0;
    p += 9 + ((packed & 128) ? 3 * 2 ** ((packed & 7) + 1) : 0);
    p++;
    skipBlocks();
  }
  throw new ImageAttachmentError("image-data");
}

function exifOrientation(input: Buffer): number {
  const b = input.toString("ascii", 0, 6) === "Exif\0\0" ? input.subarray(6) : input;
  const little = b.toString("ascii", 0, 2) === "II";
  if (!little && b.toString("ascii", 0, 2) !== "MM") throw new ImageAttachmentError("image-conversion");
  const u16 = (p: number): number => little ? b.readUInt16LE(p) : b.readUInt16BE(p);
  const u32 = (p: number): number => little ? b.readUInt32LE(p) : b.readUInt32BE(p);
  if (u16(2) !== 42) throw new ImageAttachmentError("image-conversion");
  const directory = u32(4);
  const count = u16(directory);
  if (directory + 2 + count * 12 > b.length) throw new ImageAttachmentError("image-conversion");
  for (let i = 0; i < count; i++) {
    const p = directory + 2 + i * 12;
    if (u16(p) !== 274) continue;
    const value = u16(p + 8);
    if (u16(p + 2) !== 3 || u32(p + 4) !== 1 || value < 1 || value > 8) throw new ImageAttachmentError("image-conversion");
    return value;
  }
  return 1;
}

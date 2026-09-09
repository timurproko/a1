import { isMainThread } from "node:worker_threads";
import { ImageAttachmentError } from "../../../contracts/owned-ui/index.js";
import { canonicalizeClipboardImage } from "./clipboard-image.js";
import { sourceImageInfo } from "./image-source.js";

export interface ImagePreparationLimits {
  readonly encodedBytes?: number;
  readonly decodedBytes?: number;
  readonly maxDimension?: number;
}
export interface PreparedImage {
  readonly data: string;
  readonly mimeType: string;
  readonly width: number;
  readonly height: number;
  readonly transformed: boolean;
}
export const IMAGE_TARGET_BASE64_BYTES = 4.5 * 1024 * 1024;
export const IMAGE_TARGET_DECODED_BYTES = 5 * 1024 * 1024;

export async function prepareImage(
  source: { readonly data: string; readonly mimeType: string },
  limits: ImagePreparationLimits = {},
): Promise<PreparedImage> {
  // Performance: an async signature does not move synchronous WASM work off the interactive thread.
  if (isMainThread) throw new Error("Image preparation requires a worker");
  const canonical = canonicalizeClipboardImage(source, true);
  if (canonical === null) throw new ImageAttachmentError("image-data");
  const bytes = Buffer.from(canonical.data, "base64");
  const metadata = sourceImageInfo(bytes, canonical.mimeType);
  const encodedLimit = Math.min(IMAGE_TARGET_BASE64_BYTES - 1, positive(limits.encodedBytes, Infinity));
  const decodedLimit = Math.min(IMAGE_TARGET_DECODED_BYTES, positive(limits.decodedBytes, Infinity));
  const maxDimension = positive(limits.maxDimension, Infinity);
  const fits = (length: number): boolean => length <= decodedLimit && 4 * Math.ceil(length / 3) <= encodedLimit;
  if (fits(bytes.length) && Math.max(metadata.width, metadata.height) <= maxDimension) {
    return { ...canonical, width: metadata.width, height: metadata.height, transformed: false };
  }
  if (metadata.conversionUnsafe) throw new ImageAttachmentError("image-conversion");
  const photon = await import("@silvia-odwyer/photon-node").catch(() => { throw new ImageAttachmentError("image-codec"); });
  let image: InstanceType<typeof photon.PhotonImage> | undefined;
  try {
    image = photon.PhotonImage.new_from_byteslice(bytes);
    if (image.get_width() !== metadata.width || image.get_height() !== metadata.height) throw new ImageAttachmentError("image-data");
    if (metadata.orientation !== 1) {
      const raw = image.get_raw_pixels();
      const oriented = orientPixels(raw, metadata.width, metadata.height, metadata.orientation);
      image.free(); image = undefined;
      image = new photon.PhotonImage(oriented.pixels, oriented.width, oriented.height);
    }
    const width = image.get_width(), height = image.get_height();
    let scale = Math.min(1, 2000 / Math.max(width, height), maxDimension / Math.max(width, height));
    const floor = Math.min(Math.max(width, height), 1024, maxDimension);
    for (let level = 0; level < 4; level++, scale *= 0.75) {
      const w = Math.max(1, Math.round(width * scale)), h = Math.max(1, Math.round(height * scale));
      if (Math.max(w, h) < floor) break;
      const resized = photon.resize(image, w, h, photon.SamplingFilter.Lanczos3);
      let opaque: InstanceType<typeof photon.PhotonImage> | undefined;
      try {
        const png = resized.get_bytes();
        if (fits(png.length)) return result(png, "image/png", w, h);
        const pixels = resized.get_raw_pixels();
        for (let p = 0; p < pixels.length; p += 4) {
          const alpha = (pixels[p + 3] ?? 255) / 255;
          for (let c = 0; c < 3; c++) pixels[p + c] = Math.round((pixels[p + c] ?? 0) * alpha + 255 * (1 - alpha));
          pixels[p + 3] = 255;
        }
        opaque = new photon.PhotonImage(pixels, w, h);
        for (const quality of [85, 70, 55, 40]) {
          const jpeg = opaque.get_bytes_jpeg(quality);
          if (fits(jpeg.length)) return result(jpeg, "image/jpeg", w, h);
        }
      } finally { opaque?.free(); resized.free(); }
    }
    throw new ImageAttachmentError("image-output");
  } catch (error) {
    if (error instanceof ImageAttachmentError) throw error;
    throw new ImageAttachmentError("image-conversion");
  } finally { image?.free(); }
}

function positive(value: number | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  if (!Number.isFinite(value) || value < 1) throw new ImageAttachmentError("image-output");
  return Math.floor(value);
}

function result(bytes: Uint8Array, mimeType: string, width: number, height: number): PreparedImage {
  return { data: Buffer.from(bytes).toString("base64"), mimeType, width, height, transformed: true };
}

function orientPixels(pixels: Uint8Array, width: number, height: number, orientation: number): { pixels: Uint8Array; width: number; height: number } {
  const swapped = orientation >= 5;
  const outputWidth = swapped ? height : width, outputHeight = swapped ? width : height;
  const output = new Uint8Array(pixels.length);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    let dx = x, dy = y;
    if (orientation === 2) dx = width - 1 - x;
    if (orientation === 3) { dx = width - 1 - x; dy = height - 1 - y; }
    if (orientation === 4) dy = height - 1 - y;
    if (orientation === 5) { dx = y; dy = x; }
    if (orientation === 6) { dx = height - 1 - y; dy = x; }
    if (orientation === 7) { dx = height - 1 - y; dy = width - 1 - x; }
    if (orientation === 8) { dx = y; dy = width - 1 - x; }
    const from = (y * width + x) * 4, to = (dy * outputWidth + dx) * 4;
    output.set(pixels.subarray(from, from + 4), to);
  }
  return { pixels: output, width: outputWidth, height: outputHeight };
}

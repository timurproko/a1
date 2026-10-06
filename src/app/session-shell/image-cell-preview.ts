import { isMainThread } from "node:worker_threads";
import { ImageAttachmentError } from "../../contracts/owned-ui/index.js";
import { canonicalizeClipboardImage } from "./clipboard-image.js";
import { orientImagePixels } from "./image-preparation.js";
import { sourceImageInfo } from "./image-source.js";

export const IMAGE_CELL_PREVIEW_MAX_COLUMNS = 120;
export const IMAGE_CELL_PREVIEW_MAX_ROWS = 40;
export const IMAGE_CELL_PREVIEW_MAX_DECODED_BYTES = 64 * 1024 * 1024;
export const IMAGE_CELL_PREVIEW_MAX_TERMINAL_BYTES = 512 * 1024;

export interface ImageCellPreviewOptions {
  readonly columns: number;
  readonly cellWidthPx: number;
  readonly cellHeightPx: number;
  readonly background: readonly [number, number, number];
}

export interface ImageCellPreview {
  readonly rows: readonly string[];
  readonly columns: number;
  readonly cellRows: number;
}

/** Decode and scale only in the owned worker; rendered rows contain no source bytes. */
export async function createImageCellPreview(
  source: { readonly data: string; readonly mimeType: string },
  options: ImageCellPreviewOptions,
): Promise<ImageCellPreview> {
  if (isMainThread) throw new Error("Image cell preview requires a worker");
  const canonical = canonicalizeClipboardImage(source, true);
  if (canonical === null) throw new ImageAttachmentError("image-data");
  const bytes = Buffer.from(canonical.data, "base64");
  const metadata = sourceImageInfo(bytes, canonical.mimeType);
  if (metadata.width * metadata.height * 4 > IMAGE_CELL_PREVIEW_MAX_DECODED_BYTES) {
    throw new ImageAttachmentError("image-source-size");
  }
  const requestedColumns = positiveInteger(options.columns);
  const cellWidthPx = positiveInteger(options.cellWidthPx);
  const cellHeightPx = positiveInteger(options.cellHeightPx);
  const photon = await import("@silvia-odwyer/photon-node").catch(() => {
    throw new ImageAttachmentError("image-codec");
  });
  let image: InstanceType<typeof photon.PhotonImage> | undefined;
  let resized: InstanceType<typeof photon.PhotonImage> | undefined;
  try {
    image = photon.PhotonImage.new_from_byteslice(bytes);
    if (image.get_width() !== metadata.width || image.get_height() !== metadata.height) {
      throw new ImageAttachmentError("image-data");
    }
    if (metadata.orientation !== 1) {
      const oriented = orientImagePixels(image.get_raw_pixels(), metadata.width, metadata.height, metadata.orientation);
      image.free();
      image = new photon.PhotonImage(oriented.pixels, oriented.width, oriented.height);
    }
    const sourceWidth = image.get_width(), sourceHeight = image.get_height();
    let columns = Math.max(1, Math.min(requestedColumns, IMAGE_CELL_PREVIEW_MAX_COLUMNS, Math.ceil(sourceWidth / 2)));
    let idealCellRows = columns * cellWidthPx * sourceHeight / sourceWidth / cellHeightPx;
    if (idealCellRows > IMAGE_CELL_PREVIEW_MAX_ROWS) {
      columns = Math.max(1, Math.floor(columns * IMAGE_CELL_PREVIEW_MAX_ROWS / idealCellRows));
      idealCellRows = columns * cellWidthPx * sourceHeight / sourceWidth / cellHeightPx;
    }
    const cellRows = leastDistortedCellRows(idealCellRows);
    const pixelColumns = columns * 2, pixelRows = cellRows * 2;
    resized = photon.resize(image, pixelColumns, pixelRows, photon.SamplingFilter.Lanczos3);
    const rows = renderImageCellRows(resized.get_raw_pixels(), pixelColumns, pixelRows, options.background);
    if (Buffer.byteLength(rows.join("\n"), "utf8") > IMAGE_CELL_PREVIEW_MAX_TERMINAL_BYTES) {
      throw new ImageAttachmentError("image-output");
    }
    return { rows, columns, cellRows };
  } catch (error) {
    if (error instanceof ImageAttachmentError) throw error;
    throw new ImageAttachmentError("image-conversion");
  } finally {
    resized?.free();
    image?.free();
  }
}

export function leastDistortedCellRows(idealRows: number): number {
  if (!Number.isFinite(idealRows) || idealRows <= 1) return 1;
  const upper = Math.min(IMAGE_CELL_PREVIEW_MAX_ROWS, Math.ceil(idealRows));
  const lower = Math.max(1, Math.min(upper, Math.floor(idealRows)));
  const distortion = (rows: number): number => Math.max(rows / idealRows, idealRows / rows);
  return distortion(lower) < distortion(upper) ? lower : upper;
}

const QUADRANT_GLYPHS = [" ", "▘", "▝", "▀", "▖", "▌", "▞", "▛", "▗", "▚", "▐", "▜", "▄", "▙", "▟", "█"] as const;

/** Pure bounded formatter used by worker tests; four samples occupy one two-color terminal cell. */
export function renderImageCellRows(
  pixels: Uint8Array,
  width: number,
  height: number,
  background: readonly [number, number, number],
): readonly string[] {
  if (!Number.isSafeInteger(width) || width < 2 || width > IMAGE_CELL_PREVIEW_MAX_COLUMNS * 2 || width % 2 !== 0
    || !Number.isSafeInteger(height) || height < 2 || height > IMAGE_CELL_PREVIEW_MAX_ROWS * 2
    || height % 2 !== 0 || pixels.length !== width * height * 4) {
    throw new ImageAttachmentError("image-output");
  }
  const bg = background.map(clampByte) as [number, number, number];
  const rows: string[] = [];
  for (let y = 0; y < height; y += 2) {
    let row = "", previousStyle = "";
    for (let x = 0; x < width; x += 2) {
      const samples = [
        sample(pixels, (y * width + x) * 4, bg),
        sample(pixels, (y * width + x + 1) * 4, bg),
        sample(pixels, ((y + 1) * width + x) * 4, bg),
        sample(pixels, ((y + 1) * width + x + 1) * 4, bg),
      ] as const;
      const cell = quadrantCell(samples);
      const style = `\u001b[38;2;${cell.foreground.join(";")};48;2;${cell.background.join(";")}m`;
      if (style !== previousStyle) row += style;
      row += QUADRANT_GLYPHS[cell.mask];
      previousStyle = style;
    }
    rows.push(`${row}\u001b[0m`);
  }
  return rows;
}

function quadrantCell(samples: readonly [number, number, number][]): {
  readonly foreground: readonly [number, number, number];
  readonly background: readonly [number, number, number];
  readonly mask: number;
} {
  let first = 0, second = 0, separation = -1;
  for (let left = 0; left < samples.length; left++) for (let right = left + 1; right < samples.length; right++) {
    const distance = colorDistance(samples[left]!, samples[right]!);
    if (distance > separation) { first = left; second = right; separation = distance; }
  }
  if (separation <= 0) return { foreground: samples[0]!, background: samples[0]!, mask: 15 };
  const foregroundSamples: [number, number, number][] = [], backgroundSamples: [number, number, number][] = [];
  let mask = 0;
  for (let index = 0; index < samples.length; index++) {
    const value = samples[index]!;
    if (colorDistance(value, samples[first]!) <= colorDistance(value, samples[second]!)) {
      foregroundSamples.push(value); mask |= 1 << index;
    } else backgroundSamples.push(value);
  }
  return { foreground: average(foregroundSamples), background: average(backgroundSamples), mask };
}

function sample(pixels: Uint8Array, offset: number, background: readonly [number, number, number]): [number, number, number] {
  const alpha = clampByte(pixels[offset + 3] ?? 255) / 255;
  return [0, 1, 2].map(index => Math.round(clampByte(pixels[offset + index] ?? 0) * alpha
    + background[index]! * (1 - alpha))) as [number, number, number];
}

function colorDistance(left: readonly number[], right: readonly number[]): number {
  return left.reduce((total, channel, index) => total + (channel - right[index]!) ** 2, 0);
}

function average(samples: readonly [number, number, number][]): [number, number, number] {
  return [0, 1, 2].map(index => Math.round(
    samples.reduce((total, value) => total + value[index]!, 0) / samples.length,
  )) as [number, number, number];
}

function positiveInteger(value: number): number {
  if (!Number.isFinite(value) || value < 1) throw new ImageAttachmentError("image-output");
  return Math.floor(value);
}

function clampByte(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(255, Math.round(value))) : 0;
}

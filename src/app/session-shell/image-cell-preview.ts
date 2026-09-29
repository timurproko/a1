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
    const sourceWidth = image.get_width();
    const sourceHeight = image.get_height();
    let columns = Math.max(1, Math.min(requestedColumns, IMAGE_CELL_PREVIEW_MAX_COLUMNS, sourceWidth));
    let cellRows = Math.max(1, Math.ceil((sourceHeight / sourceWidth) * columns * cellWidthPx / cellHeightPx));
    if (cellRows > IMAGE_CELL_PREVIEW_MAX_ROWS) {
      columns = Math.max(1, Math.floor(columns * IMAGE_CELL_PREVIEW_MAX_ROWS / cellRows));
      cellRows = IMAGE_CELL_PREVIEW_MAX_ROWS;
    }
    const pixelRows = cellRows * 2;
    resized = photon.resize(image, columns, pixelRows, photon.SamplingFilter.Lanczos3);
    const rows = renderImageCellRows(resized.get_raw_pixels(), columns, pixelRows, options.background);
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

/** Pure bounded formatter used by worker tests; two source pixels occupy one terminal cell. */
export function renderImageCellRows(
  pixels: Uint8Array,
  width: number,
  height: number,
  background: readonly [number, number, number],
): readonly string[] {
  if (!Number.isSafeInteger(width) || width < 1 || width > IMAGE_CELL_PREVIEW_MAX_COLUMNS
    || !Number.isSafeInteger(height) || height < 2 || height > IMAGE_CELL_PREVIEW_MAX_ROWS * 2
    || height % 2 !== 0 || pixels.length !== width * height * 4) {
    throw new ImageAttachmentError("image-output");
  }
  const bg = background.map(channel => clampByte(channel)) as [number, number, number];
  const rows: string[] = [];
  for (let y = 0; y < height; y += 2) {
    let row = "";
    for (let x = 0; x < width; x += 1) {
      const top = sample(pixels, (y * width + x) * 4, bg);
      const bottom = sample(pixels, ((y + 1) * width + x) * 4, bg);
      row += `\u001b[38;2;${top[0]};${top[1]};${top[2]};48;2;${bottom[0]};${bottom[1]};${bottom[2]}m▀`;
    }
    rows.push(`${row}\u001b[39;49m`);
  }
  return rows;
}

function sample(pixels: Uint8Array, offset: number, background: readonly [number, number, number]): [number, number, number] {
  const alpha = clampByte(pixels[offset + 3] ?? 255) / 255;
  return [0, 1, 2].map(index => Math.round(clampByte(pixels[offset + index] ?? 0) * alpha + background[index]! * (1 - alpha))) as [number, number, number];
}

function positiveInteger(value: number): number {
  if (!Number.isFinite(value) || value < 1) throw new ImageAttachmentError("image-output");
  return Math.floor(value);
}

function clampByte(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(255, Math.round(value))) : 0;
}

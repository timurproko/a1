import { Container, getCellDimensions, Image, Spacer, Text, truncateToWidth, visibleWidth, type Component } from "@earendil-works/pi-tui";
import type { OwnedUiImageAttachment, OwnedUiTranscriptBlock } from "../../../contracts/owned-ui/index.js";
import { onPiThemeChange, piTheme } from "./theme.js";
import type { PiShellImageAssetResolver, PiShellImagePreview, PiShellImagePreviewJob } from "./shell-shared-facade.js";

const MAX_PREVIEW_ROWS = 40;
const MAX_PREVIEW_BYTES = 512 * 1024;
const MAX_SIXEL_BYTES = 4 * 1024 * 1024;
const SIXEL_IMAGE_LINE_MARKER = "\u001b_Gm=0;\u001b\\";
const CELL_TOKEN = /\u001b\[38;2;(\d{1,3});(\d{1,3});(\d{1,3});48;2;(\d{1,3});(\d{1,3});(\d{1,3})m([ ▘▝▀▖▌▞▛▗▚▐▜▄▙▟█])/uy;
const CELL_RESET = "\u001b[39;49m";

/** Removes a late-row Sixel paint when its origin has been clipped above the viewport. */
export function suppressClippedSixelRows(rows: readonly string[]): readonly string[] {
  let changed = false;
  const safe = rows.map((row, index) => {
    const marker = row.indexOf(SIXEL_IMAGE_LINE_MARKER);
    if (marker < 0) return row;
    const tail = row.slice(marker + SIXEL_IMAGE_LINE_MARKER.length);
    const move = tail.match(/^\u001b\[(\d+)A\u001bP/u);
    if (move === null || Number(move[1]) < index) return row;
    const sixel = row.indexOf("\u001bP", marker + SIXEL_IMAGE_LINE_MARKER.length);
    const end = sixel < 0 ? -1 : row.indexOf("\u001b\\", sixel + 2);
    if (end < 0) return row;
    changed = true;
    return `${row.slice(0, marker)}${row.slice(end + 2)}`;
  });
  return changed ? safe : rows;
}

export function withTranscriptImagePresentation(
  component: Component,
  block: OwnedUiTranscriptBlock,
  assets: PiShellImageAssetResolver | undefined,
  showImages: boolean,
  imageWidthCells: number,
  submittedPrompt: boolean,
  changed: () => void,
  mountedImages: SubmittedImagePresentation[],
): Component {
  const references = block.imageReferences ?? [];
  if (references.length === 0) return component;
  const container = new Container();
  container.addChild(component);
  for (const reference of references) {
    container.addChild(new Spacer(1));
    const asset = assets?.resolve(reference.assetId) ?? null;
    if (!showImages) {
      container.addChild(new Text(piTheme().fg("muted", `[Image hidden: ${reference.mimeType}, ${reference.byteLength} bytes]`), 1, 0));
    } else if (asset === null) {
      container.addChild(new Text(piTheme().fg("warning", `[Image unavailable: ${reference.mimeType}]`), 1, 0));
    } else if (submittedPrompt && reference.source === "user" && assets?.preview !== undefined) {
      const preview = new SubmittedImagePresentation(reference.assetId, asset, assets.preview, imageWidthCells, changed);
      mountedImages.push(preview);
      container.addChild(preview);
    } else {
      container.addChild(new Image(asset.data, asset.mimeType, {
        fallbackColor: text => piTheme().fg("muted", text),
      }, { maxWidthCells: imageWidthCells, filename: reference.assetId }));
    }
  }
  return container;
}

/** Lifecycle-owned Windows preview for one retained submitted image. */
export class SubmittedImagePresentation implements Component {
  readonly #assetId: string;
  readonly #image: OwnedUiImageAttachment;
  readonly #preview: NonNullable<PiShellImageAssetResolver["preview"]>;
  readonly #maxWidthCells: number;
  readonly #changed: () => void;
  readonly #themeUnsubscribe: () => void;
  #generation = 0;
  #key = "";
  #state: "waiting" | "converting" | "ready" | "unavailable" = "waiting";
  #rows: readonly string[] = [];
  #sixel = false;
  readonly #cache = new Map<string, { readonly rows: readonly string[]; readonly sixel: boolean }>();
  #job: PiShellImagePreviewJob | undefined;
  #disposed = false;

  constructor(
    assetId: string,
    image: OwnedUiImageAttachment,
    preview: NonNullable<PiShellImageAssetResolver["preview"]>,
    maxWidthCells: number,
    changed: () => void,
  ) {
    this.#assetId = assetId;
    this.#image = image;
    this.#preview = preview;
    this.#maxWidthCells = maxWidthCells;
    this.#changed = changed;
    piTheme();
    this.#themeUnsubscribe = onPiThemeChange(() => {
      if (this.#disposed) return;
      this.invalidate();
      this.#changed();
    });
  }

  render(width: number): string[] {
    const columns = Math.max(1, Math.min(120, this.#maxWidthCells, width - 2));
    const cell = getCellDimensions();
    const key = `${this.#assetId}:${columns}:${cell.widthPx}:${cell.heightPx}`;
    if (!this.#disposed && key !== this.#key) this.#start(key, columns, cell);
    if (this.#state === "ready") return this.#sixel
      ? [...this.#rows]
      : this.#rows.map(row => truncateToWidth(` ${row}`, width, ""));
    const label = this.#state === "unavailable"
      ? `[Image unavailable: ${this.#image.mimeType}]`
      : `[Image preparing preview: ${this.#image.mimeType}]`;
    return new Text(piTheme().fg(this.#state === "unavailable" ? "warning" : "muted", label), 1, 0).render(width);
  }

  invalidate(): void {
    if (this.#disposed) return;
    this.#generation += 1;
    this.#job?.cancel();
    this.#job = undefined;
    this.#key = "";
    this.#state = "waiting";
    this.#rows = [];
    this.#sixel = false;
    this.#cache.clear();
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#generation += 1;
    this.#job?.cancel();
    this.#job = undefined;
    this.#rows = [];
    this.#sixel = false;
    this.#cache.clear();
    this.#themeUnsubscribe();
  }

  #start(key: string, columns: number, cell: { readonly widthPx: number; readonly heightPx: number }): void {
    this.#generation += 1;
    const generation = this.#generation;
    this.#job?.cancel();
    this.#job = undefined;
    this.#key = key;
    const cached = this.#cache.get(key);
    if (cached !== undefined) {
      this.#rows = cached.rows;
      this.#sixel = cached.sixel;
      this.#state = "ready";
      return;
    }
    this.#state = "converting";
    this.#rows = [];
    queueMicrotask(() => {
      if (this.#disposed || generation !== this.#generation) return;
      let job: PiShellImagePreviewJob;
      try {
        job = this.#preview(this.#assetId, this.#image, columns, cell);
      } catch {
        this.#settleUnavailable(generation);
        return;
      }
      this.#job = job;
      void job.result.then(result => {
        if (this.#disposed || generation !== this.#generation) return;
        const presentation = previewPresentation(result, columns);
        if (presentation === null) {
          this.#settleUnavailable(generation);
          return;
        }
        this.#job = undefined;
        this.#rows = presentation.rows;
        this.#sixel = presentation.sixel;
        this.#cache.set(key, presentation);
        this.#state = "ready";
        this.#changed();
      }).catch(() => this.#settleUnavailable(generation));
    });
  }

  #settleUnavailable(generation: number): void {
    if (this.#disposed || generation !== this.#generation) return;
    this.#job = undefined;
    this.#rows = [];
    this.#sixel = false;
    this.#state = "unavailable";
    this.#changed();
  }
}

function previewPresentation(
  result: PiShellImagePreview,
  columns: number,
): { readonly rows: readonly string[]; readonly sixel: boolean } | null {
  if (result.kind === "cells") {
    return validRows(result.rows, columns) ? { rows: [...result.rows], sixel: false } : null;
  }
  if (!Number.isSafeInteger(result.rows) || result.rows < 1 || result.rows > MAX_PREVIEW_ROWS
    || !validSixel(result.sequence)) return null;
  const rows = Array.from({ length: result.rows - 1 }, () => "");
  const moveUp = result.rows > 1 ? `\u001b[${result.rows - 1}A` : "";
  rows.push(`${SIXEL_IMAGE_LINE_MARKER}${moveUp}${result.sequence}`);
  return { rows, sixel: true };
}

function validSixel(sequence: string): boolean {
  if (Buffer.byteLength(sequence, "utf8") > MAX_SIXEL_BYTES || !sequence.endsWith("\u001b\\")) return false;
  const dataStart = sequence.indexOf("q", 2);
  if (dataStart < 0 || !/^\u001bP[0-9;]*q$/u.test(sequence.slice(0, dataStart + 1))) return false;
  return /^[\x20-\x7e]*$/u.test(sequence.slice(dataStart + 1, -2));
}

function validRows(rows: readonly string[], columns: number): boolean {
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > MAX_PREVIEW_ROWS) return false;
  let bytes = 0;
  for (const row of rows) {
    if (typeof row !== "string" || !safeCellRow(row, columns) || visibleWidth(row) > columns) return false;
    bytes += Buffer.byteLength(row, "utf8");
    if (bytes > MAX_PREVIEW_BYTES) return false;
  }
  return true;
}

function safeCellRow(row: string, columns: number): boolean {
  if (!row.endsWith(CELL_RESET)) return false;
  const body = row.slice(0, -CELL_RESET.length);
  let offset = 0, cells = 0;
  while (offset < body.length) {
    CELL_TOKEN.lastIndex = offset;
    const token = CELL_TOKEN.exec(body);
    if (token === null) return false;
    const channels = token.slice(1, 7).map(Number);
    if (channels.some(channel => channel < 0 || channel > 255)) return false;
    offset = CELL_TOKEN.lastIndex;
    cells += 1;
  }
  return cells >= 1 && cells <= columns;
}

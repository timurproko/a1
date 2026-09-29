import { Container, getCellDimensions, Image, Spacer, Text, truncateToWidth, visibleWidth, type Component } from "@earendil-works/pi-tui";
import type { OwnedUiImageAttachment, OwnedUiTranscriptBlock } from "../../../contracts/owned-ui/index.js";
import { onPiThemeChange, piTheme } from "./theme.js";
import type { PiShellImageAssetResolver, PiShellImagePreviewJob } from "./shell-shared-facade.js";

const MAX_PREVIEW_ROWS = 40;
const MAX_PREVIEW_BYTES = 512 * 1024;
const CELL_STYLE = /^\u001b\[38;2;(\d{1,3});(\d{1,3});(\d{1,3});48;2;(\d{1,3});(\d{1,3});(\d{1,3})m$/u;
const CELL_RESET = "\u001b[39;49m";

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

/** Lifecycle-owned cell preview for one retained submitted image. */
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
  readonly #cache = new Map<string, readonly string[]>();
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
    if (this.#state === "ready") return this.#rows.map(row => truncateToWidth(` ${row}`, width, ""));
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
    this.#cache.clear();
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#generation += 1;
    this.#job?.cancel();
    this.#job = undefined;
    this.#rows = [];
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
      this.#rows = cached;
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
      void job.result.then(rows => {
        if (this.#disposed || generation !== this.#generation) return;
        if (!validRows(rows, columns)) {
          this.#settleUnavailable(generation);
          return;
        }
        this.#job = undefined;
        this.#rows = [...rows];
        this.#cache.set(key, this.#rows);
        this.#state = "ready";
        this.#changed();
      }).catch(() => this.#settleUnavailable(generation));
    });
  }

  #settleUnavailable(generation: number): void {
    if (this.#disposed || generation !== this.#generation) return;
    this.#job = undefined;
    this.#rows = [];
    this.#state = "unavailable";
    this.#changed();
  }
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
  const cells = row.slice(0, -CELL_RESET.length).split("▀");
  if (cells.pop() !== "" || cells.length < 1 || cells.length > columns) return false;
  return cells.every(cell => {
    const channels = CELL_STYLE.exec(cell)?.slice(1).map(Number);
    return channels?.length === 6 && channels.every(channel => channel >= 0 && channel <= 255);
  });
}

import { getCellDimensions, Text, visibleWidth, type Component } from "@earendil-works/pi-tui";
import type { OwnedUiImageAttachment } from "../../../contracts/owned-ui/index.js";
import type { PiShellImageAssetResolver, PiShellImagePreviewJob } from "./shell-shared-facade.js";
import { piTheme } from "./theme.js";

const MAX_PREVIEW_ROWS = 40;
const MAX_PREVIEW_BYTES = 512 * 1024;
const STYLE = /\u001b\[38;2;(\d{1,3});(\d{1,3});(\d{1,3});48;2;(\d{1,3});(\d{1,3});(\d{1,3})m/uy;
const GLYPH = /[ ▘▝▀▖▌▞▛▗▚▐▜▄▙▟█]/uy;
const RESET = "\u001b[0m";

/** Mounted only for bare A1's Windows-host submitted-image fallback. */
export class WindowsImageCellPresentation implements Component {
  readonly #assetId: string;
  readonly #image: OwnedUiImageAttachment;
  readonly #preview: NonNullable<PiShellImageAssetResolver["preview"]>;
  readonly #maxWidthCells: number;
  readonly #changed: () => void;
  readonly #cache = new Map<string, readonly string[]>();
  #generation = 0;
  #key = "";
  #rows: readonly string[] = [];
  #state: "waiting" | "converting" | "ready" | "unavailable" = "waiting";
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
  }

  render(width: number): string[] {
    const columns = Math.max(1, Math.min(120, this.#maxWidthCells, width - 2));
    const cell = getCellDimensions();
    const key = `${columns}:${cell.widthPx}:${cell.heightPx}`;
    if (!this.#disposed && key !== this.#key) this.#start(key, columns, cell);
    if (this.#state === "ready") return this.#rows.map(row => `${RESET} ${row}${RESET}`);
    const text = this.#state === "unavailable"
      ? `[Image unavailable: ${this.#image.mimeType}]`
      : `[Image preparing preview: ${this.#image.mimeType}]`;
    return new Text(piTheme().fg(this.#state === "unavailable" ? "warning" : "muted", text), 1, 0).render(width);
  }

  invalidate(): void {}

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#generation += 1;
    this.#job?.cancel();
    this.#job = undefined;
    this.#rows = [];
    this.#cache.clear();
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
    this.#rows = [];
    this.#state = "converting";
    const job = this.#preview(this.#assetId, this.#image, columns, cell);
    this.#job = job;
    void job.result.then(result => {
      if (this.#disposed || generation !== this.#generation) return;
      this.#job = undefined;
      if (!validRows(result.rows, columns)) {
        this.#state = "unavailable";
      } else {
        this.#rows = [...result.rows];
        this.#cache.set(key, this.#rows);
        this.#state = "ready";
      }
      this.#changed();
    }).catch(() => {
      if (this.#disposed || generation !== this.#generation) return;
      this.#job = undefined;
      this.#state = "unavailable";
      this.#changed();
    });
  }
}

function validRows(rows: readonly string[], columns: number): boolean {
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > MAX_PREVIEW_ROWS) return false;
  let bytes = 0;
  for (const row of rows) {
    if (typeof row !== "string" || visibleWidth(row) > columns || !safeRow(row)) return false;
    bytes += Buffer.byteLength(row, "utf8");
    if (bytes > MAX_PREVIEW_BYTES) return false;
  }
  return true;
}

function safeRow(row: string): boolean {
  if (!row.endsWith(RESET)) return false;
  const body = row.slice(0, -RESET.length);
  let offset = 0, cells = 0, styled = false;
  while (offset < body.length) {
    STYLE.lastIndex = offset;
    const style = STYLE.exec(body);
    if (style !== null) {
      if (style.slice(1).map(Number).some(channel => channel < 0 || channel > 255)) return false;
      offset = STYLE.lastIndex;
      styled = true;
      continue;
    }
    if (!styled) return false;
    GLYPH.lastIndex = offset;
    if (GLYPH.exec(body) === null) return false;
    offset = GLYPH.lastIndex;
    cells += 1;
  }
  return cells > 0;
}

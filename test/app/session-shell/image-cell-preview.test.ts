import { stripTerminalSequences, visibleWidth } from "@earendil-works/pi-tui";
import { describe, expect, it } from "vitest";
import { screenshotPng } from "../../fixtures/image-sources.js";
import {
  IMAGE_CELL_PREVIEW_MAX_ROWS,
  createImageCellPreview,
  renderImageCellRows,
} from "../../../src/app/session-shell/image-cell-preview.js";
import {
  runImageWorker,
  shouldUseImageCellPreview,
  startImageCellPreview,
} from "../../../src/app/session-shell/image-preparation-client.js";

const source = (width = 120, height = 60) => ({
  type: "image" as const,
  data: screenshotPng(width, height, false).toString("base64"),
  mimeType: "image/png",
});

describe("Windows submitted-image cell preview", () => {
  it("selects only the Windows product path", () => {
    expect(shouldUseImageCellPreview("win32")).toBe(true);
    expect(shouldUseImageCellPreview("darwin")).toBe(false);
    expect(shouldUseImageCellPreview("linux")).toBe(false);
  });

  it("pairs two RGBA samples into one truecolor half block and composites transparency", () => {
    const pixels = new Uint8Array([
      255, 0, 0, 255,
      0, 0, 255, 128,
    ]);
    const rows = renderImageCellRows(pixels, 1, 2, [255, 255, 255]);
    expect(rows).toEqual(["\u001b[38;2;255;0;0;48;2;127;127;255m▀\u001b[39;49m"]);
    expect(stripTerminalSequences(rows[0]!)).toBe("▀");
    expect(visibleWidth(rows[0]!)).toBe(1);
  });

  it("decodes and scales in the real worker into bounded ordinary terminal rows", async () => {
    const image = source(240, 120);
    const result = await runImageWorker<{ readonly rows: readonly string[]; readonly columns: number; readonly cellRows: number }>({
      kind: "preview",
      source: image,
      options: { columns: 60, cellWidthPx: 9, cellHeightPx: 18, background: [0, 0, 0] },
    }, AbortSignal.timeout(15_000));
    expect(result.columns).toBe(60);
    expect(result.cellRows).toBe(15);
    expect(result.rows).toHaveLength(15);
    expect(result.rows.every(row => visibleWidth(row) === 60)).toBe(true);
    expect(result.rows.join("\n")).not.toMatch(/\u001b_G|\u001b\]1337;File=|\u001bPq|iVBOR/u);
  });

  it("caps tall images and rejects main-thread decoding", async () => {
    const result = await runImageWorker<{ readonly rows: readonly string[]; readonly columns: number; readonly cellRows: number }>({
      kind: "preview",
      source: source(40, 400),
      options: { columns: 120, cellWidthPx: 9, cellHeightPx: 18, background: [0, 0, 0] },
    }, AbortSignal.timeout(15_000));
    expect(result.cellRows).toBe(IMAGE_CELL_PREVIEW_MAX_ROWS);
    expect(result.rows).toHaveLength(IMAGE_CELL_PREVIEW_MAX_ROWS);
    await expect(createImageCellPreview(source(), {
      columns: 60, cellWidthPx: 9, cellHeightPx: 18, background: [0, 0, 0],
    })).rejects.toThrow("requires a worker");
  });

  it("returns a payload-free classified failure for malformed source data", async () => {
    const result = runImageWorker({
      kind: "preview",
      source: { data: "AQID", mimeType: "image/png" },
      options: { columns: 60, cellWidthPx: 9, cellHeightPx: 18, background: [0, 0, 0] },
    }, AbortSignal.timeout(15_000));
    await expect(result).rejects.toMatchObject({ code: "image-conversion" });
    await expect(result).rejects.not.toThrow(/AQID/u);
  });

  it("cancels an owned preview job without publishing late rows", async () => {
    const job = startImageCellPreview(source(1200, 800), 80, [0, 0, 0], { widthPx: 10, heightPx: 20 });
    job.cancel();
    await expect(job.result).rejects.toMatchObject({ code: "image-canceled" });
  });
});

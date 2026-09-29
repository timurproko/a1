import { stripTerminalSequences, visibleWidth } from "@earendil-works/pi-tui";
import { describe, expect, it } from "vitest";
import { screenshotPng } from "../../fixtures/image-sources.js";
import {
  IMAGE_CELL_PREVIEW_MAX_ROWS,
  IMAGE_SIXEL_PREVIEW_MAX_TERMINAL_BYTES,
  createImageCellPreview,
  renderImageCellRows,
  type ImageCellPreview,
} from "../../../src/app/session-shell/image-cell-preview.js";
import {
  runImageWorker,
  startImageCellPreview,
  windowsSubmittedImagePreviewFormat,
} from "../../../src/app/session-shell/image-preparation-client.js";

const source = (width = 120, height = 60) => ({
  type: "image" as const,
  data: screenshotPng(width, height, false).toString("base64"),
  mimeType: "image/png",
});

const options = (format: "cells" | "sixel") => ({
  format, columns: 60, cellWidthPx: 9, cellHeightPx: 18, background: [0, 0, 0] as const,
});

describe("Windows submitted-image preview", () => {
  it("selects Sixel only for declared Windows hosts and cells for unknown Windows hosts", () => {
    expect(windowsSubmittedImagePreviewFormat("win32", { WT_SESSION: "session" })).toBe("sixel");
    expect(windowsSubmittedImagePreviewFormat("win32", { TERM_PROGRAM: "WezTerm" })).toBe("sixel");
    expect(windowsSubmittedImagePreviewFormat("win32", {})).toBe("cells");
    expect(windowsSubmittedImagePreviewFormat("darwin", { WT_SESSION: "session" })).toBeNull();
    expect(windowsSubmittedImagePreviewFormat("linux", {})).toBeNull();
  });

  it("pairs four RGBA samples into one truecolor quadrant and composites transparency", () => {
    const pixels = new Uint8Array([
      255, 0, 0, 255, 255, 0, 0, 255,
      255, 0, 0, 255, 0, 0, 255, 128,
    ]);
    const rows = renderImageCellRows(pixels, 2, 2, [255, 255, 255]);
    expect(rows).toEqual(["\u001b[38;2;255;0;0;48;2;127;127;255m▛\u001b[39;49m"]);
    expect(stripTerminalSequences(rows[0]!)).toBe("▛");
    expect(visibleWidth(rows[0]!)).toBe(1);
  });

  it("decodes and scales in the real worker into bounded ordinary terminal rows", async () => {
    const result = await runImageWorker<ImageCellPreview>({
      kind: "preview", source: source(240, 120), options: options("cells"),
    }, AbortSignal.timeout(15_000));
    expect(result.kind).toBe("cells");
    if (result.kind !== "cells") throw new Error("expected cells");
    expect(result.columns).toBe(60);
    expect(result.cellRows).toBe(15);
    expect(result.rows).toHaveLength(15);
    expect(result.rows.every(row => visibleWidth(row) === 60)).toBe(true);
    expect(result.rows.join("\n")).not.toMatch(/\u001b_G|\u001b\]1337;File=|\u001bPq|iVBOR/u);
  });

  it("encodes a high-fidelity bounded Sixel sequence in the real worker", async () => {
    const result = await runImageWorker<ImageCellPreview>({
      kind: "preview", source: source(1200, 800), options: options("sixel"),
    }, AbortSignal.timeout(15_000));
    expect(result.kind).toBe("sixel");
    if (result.kind !== "sixel") throw new Error("expected Sixel");
    expect(result.pixelWidth).toBe(540);
    expect(result.pixelHeight).toBe(360);
    expect(result.cellRows).toBe(20);
    expect(result.sequence).toMatch(/^\u001bP[0-9;]*q/u);
    expect(result.sequence.endsWith("\u001b\\")).toBe(true);
    expect(Buffer.byteLength(result.sequence, "utf8")).toBeLessThanOrEqual(IMAGE_SIXEL_PREVIEW_MAX_TERMINAL_BYTES);
    expect(result.sequence).not.toContain(source(1200, 800).data.slice(0, 40));
  });

  it("caps tall images and rejects main-thread decoding", async () => {
    const result = await runImageWorker<ImageCellPreview>({
      kind: "preview",
      source: source(40, 400),
      options: { ...options("cells"), columns: 120 },
    }, AbortSignal.timeout(15_000));
    expect(result.kind).toBe("cells");
    if (result.kind !== "cells") throw new Error("expected cells");
    expect(result.cellRows).toBe(IMAGE_CELL_PREVIEW_MAX_ROWS);
    expect(result.rows).toHaveLength(IMAGE_CELL_PREVIEW_MAX_ROWS);
    await expect(createImageCellPreview(source(), options("cells"))).rejects.toThrow("requires a worker");
  });

  it("returns a payload-free classified failure for malformed source data", async () => {
    const result = runImageWorker({
      kind: "preview", source: { data: "AQID", mimeType: "image/png" }, options: options("cells"),
    }, AbortSignal.timeout(15_000));
    await expect(result).rejects.toMatchObject({ code: "image-conversion" });
    await expect(result).rejects.not.toThrow(/AQID/u);
  });

  it("cancels an owned preview job without publishing late rows", async () => {
    const job = startImageCellPreview(source(1200, 800), 80, [0, 0, 0], { widthPx: 10, heightPx: 20 }, "sixel");
    job.cancel();
    await expect(job.result).rejects.toMatchObject({ code: "image-canceled" });
  });
});

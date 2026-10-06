import { stripTerminalSequences, visibleWidth } from "@earendil-works/pi-tui";
import { describe, expect, it } from "vitest";
import {
  IMAGE_CELL_PREVIEW_MAX_ROWS,
  renderImageCellRows,
  type ImageCellPreview,
} from "../../../src/app/session-shell/image-cell-preview.js";
import {
  runImageWorker,
  usesWindowsSubmittedImageCellPreview,
} from "../../../src/app/session-shell/image-preparation-client.js";
import { screenshotPng } from "../../fixtures/image-sources.js";

describe("Windows submitted-image cell preview", () => {
  it("selects Windows Terminal and Windows WezTerm but excludes other hosts", () => {
    expect(usesWindowsSubmittedImageCellPreview("win32", { WT_SESSION: "session" })).toBe(true);
    expect(usesWindowsSubmittedImageCellPreview("win32", { WEZTERM_PANE: "1" })).toBe(true);
    expect(usesWindowsSubmittedImageCellPreview("win32", { TERM_PROGRAM: "WezTerm" })).toBe(true);
    expect(usesWindowsSubmittedImageCellPreview("win32", { WT_SESSION: "inherited", WEZTERM_PANE: "1" })).toBe(true);
    expect(usesWindowsSubmittedImageCellPreview("win32", {})).toBe(false);
    expect(usesWindowsSubmittedImageCellPreview("linux", { WEZTERM_PANE: "1" })).toBe(false);
  });

  it("pairs four RGBA samples into one truecolor quadrant and resets the row", () => {
    const pixels = new Uint8Array([
      255, 0, 0, 255, 255, 0, 0, 255,
      255, 0, 0, 255, 0, 0, 255, 128,
    ]);
    const rows = renderImageCellRows(pixels, 2, 2, [255, 255, 255]);
    expect(rows).toEqual(["\u001b[38;2;255;0;0;48;2;127;127;255m▛\u001b[0m"]);
    expect(stripTerminalSequences(rows[0]!)).toBe("▛");
    expect(visibleWidth(rows[0]!)).toBe(1);
  });

  it("decodes and aspect-fits bounded ordinary rows in the real worker", async () => {
    const source = { mimeType: "image/png", data: screenshotPng(240, 120, false).toString("base64") };
    const result = await runImageWorker<ImageCellPreview>({
      kind: "preview",
      source,
      options: { columns: 60, cellWidthPx: 9, cellHeightPx: 18, background: [0, 0, 0] },
    }, AbortSignal.timeout(15_000));
    expect(result.columns).toBe(60);
    expect(result.cellRows).toBe(15);
    expect(result.rows).toHaveLength(15);
    expect(result.rows.length).toBeLessThanOrEqual(IMAGE_CELL_PREVIEW_MAX_ROWS);
    expect(result.rows.every(row => visibleWidth(row) === 60 && row.endsWith("\u001b[0m"))).toBe(true);
    expect(result.rows.join("\n")).not.toMatch(/\u001b_G|\u001bP|\u001b\]1337;File=|iVBOR/u);
  }, 20_000);
});

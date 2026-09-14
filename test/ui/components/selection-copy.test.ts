import { describe, expect, it } from "vitest";
import { TranscriptViewport } from "../../../src/ui/components/transcript-viewport.js";
import { MAX_COPY_ROWS, MAX_COPY_SOURCE_UNITS, selectionCopyLineContent, selectionCopyRowText } from "../../../src/ui/components/selection-copy.js";
import { textSelectionText } from "../../../src/ui/components/text-selection.js";

/** Copy snapshots preserve the existing semantic text oracle across delayed delivery and reflow. */
describe("selected response source snapshots", () => {
  it.each([false, true])("keeps exact multiline content after clear, new frames and reset (reverse=%s)", reverse => {
    const viewport = new TranscriptViewport();
    const rows = ["\u001b[31mhello 界\u001b[0m", "  e\u0301 👩‍💻 next", "Working..."];
    viewport.compose({ documentRows: rows, selectableDocumentRowCount: 2, dockRows: [], promptAnchors: [], width: 50, height: 4 });
    viewport.pressSelection(reverse ? 10 : 2, reverse ? 2 : 1, 0);
    viewport.extendSelection(reverse ? 2 : 10, reverse ? 1 : 2, 1, false);
    viewport.releaseSelection();
    const oracle = viewport.selectedText();
    const snapshot = viewport.captureSelectedText()!;
    viewport.clearSelection();
    rows[0] = "replacement";
    viewport.compose({ documentRows: ["unrelated"], dockRows: [], promptAnchors: [], width: 20, height: 3 });
    viewport.reset();
    const text = snapshot.rows.map((row, index) => selectionCopyRowText(snapshot, row, index)).join("\n");
    expect(text).toBe(oracle);
    expect(text).not.toContain("Working");
    expect(text).not.toContain("replacement");
    expect(snapshot.rows).toHaveLength(2);
  });

  it.each([
    "alpha", "  alpha beta  ", " alpha  ", "\u001b[32m 界 e\u0301 👩‍💻\u001b[0m  ", "    ", "\talpha\t", "  prompt 12:34 ",
  ])("matches the existing semantic extraction oracle for %j", text => {
    for (const prompt of [undefined, "first", "continuation"] as const) {
      for (const from of [0, 1, 2, 4, 8]) {
        for (const to of [from + 1, from + 5, Number.MAX_SAFE_INTEGER]) {
          const selection = { start: { line: 0, column: from }, end: { line: 0, column: to } };
          const expected = textSelectionText(selection, [text], () => selectionCopyLineContent(text, prompt));
          expect(selectionCopyRowText({ selection }, { text, ...(prompt === undefined ? {} : { prompt }) }, 0)).toBe(expected);
        }
      }
    }
  });

  it("does not turn empty clicks or whitespace-only single-row ranges into copy actions", () => {
    const viewport = new TranscriptViewport();
    viewport.compose({ documentRows: ["     "], dockRows: [], promptAnchors: [], width: 20, height: 1 });
    viewport.pressSelection(1, 1, 0);
    expect(viewport.captureSelectedText()).toBeNull();
    viewport.extendSelection(4, 1, 1, false);
    viewport.releaseSelection();
    expect(viewport.selectedText()).toBe("");
    expect(viewport.captureSelectedText()).toBeNull();
  });

  it("bounds selected row references and rejects size without retaining an oversized payload", () => {
    const viewport = new TranscriptViewport();
    // Performance: tiny frame; no huge terminal render is needed to select a long document range.
    const rows = Array.from({ length: MAX_COPY_ROWS + 1 }, () => "row");
    viewport.compose({ documentRows: rows, dockRows: [], promptAnchors: [], width: 20, height: 2 });
    viewport.scrollTo(0);
    viewport.pressSelection(1, 1, 0);
    viewport.scrollToEnd();
    viewport.extendSelection(3, 2, 1, false);
    const rejected = viewport.captureSelectedText();
    expect(rejected).toMatchObject({ rejected: "size", rows: [], sourceUnits: 0 });
    expect(MAX_COPY_SOURCE_UNITS).toBe(32 * 1024 * 1024);
  });
});

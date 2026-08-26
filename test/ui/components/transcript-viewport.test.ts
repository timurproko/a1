import { describe, expect, it } from "vitest";
import { backgroundSgrSpan, stripAnsi, TranscriptViewport } from "../../../src/ui/components/index.js";

const ALWAYS = { scrollbarAppearance: "always" as const, scrollbarStyle: "thin" as const };
const rows = (count: number) => Array.from({ length: count }, (_, index) => `row ${index}`);

describe("transcript viewport", () => {
  it("returns an exact-height transcript-above-dock frame and leaves one line above the rail", () => {
    const viewport = new TranscriptViewport();
    viewport.setConfig(ALWAYS);
    const frame = viewport.compose({ documentRows: rows(10), dockRows: ["editor", "footer"], promptAnchors: [], width: 30, height: 6, now: 100 });

    expect(frame.rows).toHaveLength(6);
    expect(stripAnsi(frame.rows[0] ?? "")).not.toContain("│");
    expect(stripAnsi(frame.rows[1] ?? "")).toContain("│");
    expect(frame.hits.rail).toMatchObject({ rowStart: 2, trackHeight: 3 });
    expect(frame.rows.slice(-2).map(row => row.trimEnd())).toEqual(["editor", "footer"]);
  });

  it("keeps a detached row fixed while output grows and resumes at the end", () => {
    const viewport = new TranscriptViewport();
    viewport.setConfig(ALWAYS);
    viewport.compose({ documentRows: rows(10), dockRows: ["dock"], promptAnchors: [], width: 40, height: 6, now: 100 });
    viewport.scrollBy(-2, 101);
    const detachedTop = viewport.scrollTop;
    viewport.noteNewMessage();
    viewport.noteNewMessage();
    const detached = viewport.compose({ documentRows: rows(13), dockRows: ["dock"], promptAnchors: [], width: 40, height: 6, now: 102 });
    expect(detached.followingEnd).toBe(false);
    expect(detached.scrollTop).toBe(detachedTop);
    expect(viewport.newMessages).toBe(2);
    expect(stripAnsi(detached.rows[4] ?? "")).toContain("2 new messages (Alt+End)");

    viewport.scrollToEnd(103);
    const followed = viewport.compose({ documentRows: rows(14), dockRows: ["dock"], promptAnchors: [], width: 40, height: 6, now: 104 });
    expect(followed.followingEnd).toBe(true);
    expect(followed.scrollTop).toBe(followed.maxScroll);
    expect(viewport.newMessages).toBe(0);
    expect(followed.rows.some(row => stripAnsi(row).includes("Jump to bottom"))).toBe(false);
  });

  it("keeps the bottom control on its fixed terminal row when transient dock rows appear", () => {
    const viewport = new TranscriptViewport();
    viewport.setConfig(ALWAYS);
    viewport.compose({ documentRows: rows(20), dockRows: ["editor", "footer"], promptAnchors: [], width: 40, height: 10, bottomControlRow: 6, now: 100 });
    viewport.scrollBy(-2, 101);
    const before = viewport.compose({ documentRows: rows(20), dockRows: ["editor", "footer"], promptAnchors: [], width: 40, height: 10, bottomControlRow: 6, now: 102 });
    expect(before.hits.bottom?.row).toBe(7);

    const notified = viewport.compose({
      documentRows: rows(20),
      dockRows: ["notification one", "notification two", "editor", "footer"],
      promptAnchors: [],
      width: 40,
      height: 10,
      bottomControlRow: 6,
      now: 103,
    });
    expect(notified.hits.bottom?.row).toBe(7);
    expect(stripAnsi(notified.rows[6] ?? "")).toContain("Jump to bottom (Alt+End)");
  });

  it("jumps from the governing pinned prompt to each previous prompt", () => {
    const viewport = new TranscriptViewport();
    viewport.setConfig(ALWAYS);
    const anchors = [
      { id: "one", firstRow: 1, lastRow: 1, sourceRow: "❯ one" },
      { id: "two", firstRow: 10, lastRow: 10, sourceRow: "❯ two" },
      { id: "three", firstRow: 20, lastRow: 20, sourceRow: "❯ three" },
    ];
    viewport.compose({ documentRows: rows(30), dockRows: ["dock"], promptAnchors: anchors, width: 36, height: 6, now: 100 });

    expect(viewport.scrollTop).toBe(25);
    expect(viewport.scrollToPreviousPrompt(101)).toBe(true);
    expect(viewport.scrollTop).toBe(20);
    expect(viewport.scrollToPreviousPrompt(102)).toBe(true);
    expect(viewport.scrollTop).toBe(10);
    expect(viewport.scrollToPreviousPrompt(103)).toBe(true);
    expect(viewport.scrollTop).toBe(0);
    expect(viewport.scrollToPreviousPrompt(104)).toBe(false);
    expect(viewport.scrollTop).toBe(0);
  });

  it("pins the semantic source prompt prominently, then quiets it after all continuations leave", () => {
    const viewport = new TranscriptViewport();
    viewport.setConfig(ALWAYS);
    const anchors = [{ id: "prompt", firstRow: 1, lastRow: 2, sourceRow: "❯ prompt                 11:45" }];
    viewport.compose({ documentRows: rows(9), dockRows: ["dock"], promptAnchors: anchors, width: 36, height: 6, now: 100 });

    viewport.scrollTo(2, 101);
    const prominent = viewport.compose({ documentRows: rows(9), dockRows: ["dock"], promptAnchors: anchors, width: 36, height: 6, now: 102 });
    expect(stripAnsi(prominent.rows[0] ?? "").trimEnd()).toBe("❯ prompt                 11:45");
    expect(prominent.hits.sticky?.target).toBe(1);

    viewport.scrollTo(4, 103);
    const quiet = viewport.compose({ documentRows: rows(9), dockRows: ["dock"], promptAnchors: anchors, width: 36, height: 6, now: 104 });
    expect(quiet.rows[0]).toContain("\u001b[2m");
    expect(stripAnsi(quiet.rows[0] ?? "").trimEnd()).toBe("❯ prompt                 11:45");

    viewport.setStickyHovered(true);
    const hovered = viewport.compose({ documentRows: rows(9), dockRows: ["dock"], promptAnchors: anchors, width: 36, height: 6, now: 105 });
    expect(hovered.rows[0]).toContain("\u001b[7m");
    expect(hovered.rows[0]).not.toContain("\u001b[2m");
    expect(stripAnsi(hovered.rows[0] ?? "").trimEnd()).toBe("❯ prompt                 11:45");
  });

  it("paints the final cell for edge whitespace but not for a full-width word", () => {
    const selectedRange = (text: string, column: number): { readonly range: readonly [number, number]; readonly copied: string | null } => {
      const viewport = new TranscriptViewport();
      viewport.setConfig(ALWAYS);
      const input = { documentRows: [text, "row 1", "row 2", "row 3"], dockRows: [] as string[], promptAnchors: [], width: 10, height: 3, now: 100 };
      viewport.compose(input);
      viewport.scrollTo(0, 101);
      viewport.compose({ ...input, now: 102 });
      viewport.pressSelection(column, 1, 200);
      viewport.releaseSelection();
      viewport.pressSelection(column, 1, 201);
      const copied = viewport.selectedText();
      let range: readonly [number, number] = [-1, -1];
      viewport.compose({
        ...input,
        now: 202,
        theme: {
          track: value => value,
          thumb: value => value,
          sticky: value => value,
          quietSticky: value => value,
          bottomControl: value => value,
          selection: (line, from, to) => { range = [from, to]; return line; },
        },
      });
      return { range, copied };
    };

    expect(selectedRange("abc      ", 5)).toEqual({ range: [3, 10], copied: "" });
    expect(selectedRange("abcdefghi", 5)).toEqual({ range: [0, 9], copied: "abcdefghi" });

    const viewport = new TranscriptViewport();
    viewport.setConfig(ALWAYS);
    const input = { documentRows: ["abcdefghi", "next", "row 2", "row 3"], dockRows: [] as string[], promptAnchors: [], width: 10, height: 3, now: 300 };
    viewport.compose(input);
    viewport.scrollTo(0, 301);
    viewport.compose({ ...input, now: 302 });
    viewport.pressSelection(2, 1, 303);
    viewport.extendSelection(2, 2, 304);
    const ranges: Array<readonly [number, number]> = [];
    viewport.compose({
      ...input,
      now: 305,
      theme: {
        track: value => value,
        thumb: value => value,
        sticky: value => value,
        quietSticky: value => value,
        bottomControl: value => value,
        selection: (line, from, to) => { ranges.push([from, to]); return line; },
      },
    });
    expect(ranges).toContainEqual([1, 10]);
  });

  it("uses matching normal and hover surface roles for sticky and bottom controls", () => {
    const viewport = new TranscriptViewport();
    viewport.setConfig(ALWAYS);
    const anchors = [{ id: "prompt", firstRow: 1, lastRow: 1, sourceRow: "❯ prompt                 11:45" }];
    const theme = {
      track: (text: string) => text,
      thumb: (text: string) => text,
      sticky: (text: string, hovered: boolean) => `\u001b[${hovered ? 46 : 45}m${text}\u001b[49m`,
      quietSticky: (text: string) => text,
      bottomControl: (text: string, hovered: boolean) => `\u001b[${hovered ? 46 : 45}m${text}\u001b[49m`,
      selection: (text: string) => text,
    };
    viewport.compose({ documentRows: rows(12), dockRows: ["dock"], promptAnchors: anchors, width: 40, height: 6, now: 100, theme });
    viewport.scrollTo(4, 101);
    const normal = viewport.compose({ documentRows: rows(12), dockRows: ["dock"], promptAnchors: anchors, width: 40, height: 6, now: 102, theme });
    expect(normal.rows[0]).toContain("\u001b[45m");
    expect(normal.rows[(normal.hits.bottom?.row ?? 1) - 1]).toContain("\u001b]8;;\u001b\\\u001b[0m\u001b[45m");

    viewport.setStickyHovered(true);
    viewport.setBottomHovered(true);
    const hovered = viewport.compose({ documentRows: rows(12), dockRows: ["dock"], promptAnchors: anchors, width: 40, height: 6, now: 103, theme });
    expect(hovered.rows[0]).toContain("\u001b[46m");
    expect(hovered.rows[(hovered.hits.bottom?.row ?? 1) - 1]).toContain("\u001b[46m");
  });

  it("keeps edge motion from adding scroll rows outside the cadence timer", () => {
    const viewport = new TranscriptViewport();
    viewport.setConfig(ALWAYS);
    viewport.compose({ documentRows: rows(20), dockRows: [], promptAnchors: [], width: 20, height: 5, now: 100 });
    viewport.pressSelection(2, 3, 101);
    const before = viewport.scrollTop;

    viewport.extendSelection(2, 1, 102, false);
    viewport.extendSelection(2, 1, 103, false);
    viewport.extendSelection(2, 1, 104, false);
    expect(viewport.scrollTop).toBe(before);

    viewport.extendSelection(2, 1, 105, true);
    expect(viewport.scrollTop).toBe(before - 1);
  });

  it("keeps the scrollbar thumb visible through a multi-row text selection", () => {
    const viewport = new TranscriptViewport();
    viewport.setConfig(ALWAYS);
    const selectionEnds: number[] = [];
    const theme = {
      track: (text: string) => `\u001b[31m${text}\u001b[39m`,
      thumb: (text: string) => `\u001b[32m${text}\u001b[39m`,
      sticky: (text: string) => text,
      quietSticky: (text: string) => text,
      bottomControl: (text: string) => text,
      selection: (line: string, from: number, to: number) => {
        selectionEnds.push(to);
        return backgroundSgrSpan(line, from, to, "\u001b[45m");
      },
    };
    viewport.compose({ documentRows: rows(10), dockRows: [], promptAnchors: [], width: 10, height: 5, now: 100, theme });
    viewport.pressSelection(1, 3, 101);
    viewport.extendSelection(9, 5, 102);
    viewport.releaseSelection();

    const selected = viewport.compose({ documentRows: rows(10), dockRows: [], promptAnchors: [], width: 10, height: 5, now: 103, theme });
    const thumbRow = selected.rows[3] ?? "";
    expect(selectionEnds).toContain(10);
    expect(stripAnsi(thumbRow).at(-1)).toBe("│");
    expect(thumbRow).toContain("\u001b[32m│");
  });

  it("reserves hover geometry while idle, reveals after activity, and gives hidden mode its column back", () => {
    const viewport = new TranscriptViewport();
    viewport.setConfig({ scrollbarAppearance: "hover", scrollbarStyle: "thick" });
    const fitting = viewport.compose({ documentRows: ["timestamp 14:48"], dockRows: ["dock"], promptAnchors: [], width: 20, height: 5, now: 99 });
    expect(fitting.contentWidth).toBe(19);
    expect(stripAnsi(fitting.rows[0] ?? "")).toHaveLength(20);
    expect(stripAnsi(fitting.rows[0] ?? "").endsWith(" ")).toBe(true);

    const idle = viewport.compose({ documentRows: rows(10), dockRows: ["dock"], promptAnchors: [], width: 20, height: 5, now: 100 });
    expect(idle.contentWidth).toBe(19);
    expect(idle.rows.every(row => !stripAnsi(row).includes("┃"))).toBe(true);

    viewport.noteScrollActivity(100, 50);
    const active = viewport.compose({ documentRows: rows(10), dockRows: ["dock"], promptAnchors: [], width: 20, height: 5, now: 120 });
    expect(active.rows.some(row => stripAnsi(row).includes("┃"))).toBe(true);
    const expired = viewport.compose({ documentRows: rows(10), dockRows: ["dock"], promptAnchors: [], width: 20, height: 5, now: 151 });
    expect(expired.contentWidth).toBe(19);
    expect(expired.rows.every(row => !stripAnsi(row).includes("┃"))).toBe(true);

    viewport.setConfig({ scrollbarAppearance: "hidden", scrollbarStyle: "thin" });
    const hidden = viewport.compose({ documentRows: rows(10), dockRows: ["dock"], promptAnchors: [], width: 20, height: 5, now: 152 });
    expect(hidden.contentWidth).toBe(20);
    expect(hidden.hits.rail).toBeNull();
  });
});

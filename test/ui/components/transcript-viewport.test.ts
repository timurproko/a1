import { describe, expect, it } from "vitest";
import {
  assertTranscriptViewportFrameDescriptor,
  backgroundSgrSpan,
  stripAnsi,
  TranscriptViewport,
  type TranscriptViewportFrameDescriptor,
} from "../../../src/ui/components/index.js";

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

  it("reuses established transcript rows for a same-height dock-only frame and fails closed on geometry or selection", () => {
    const viewport = new TranscriptViewport();
    viewport.setConfig(ALWAYS);
    const initial = viewport.compose({
      documentRows: rows(12),
      dockRows: ["editor", "footer"],
      promptAnchors: [],
      width: 30,
      height: 7,
      now: 100,
    });
    const dockOnly = viewport.composeDockOnly(["edited", "footer"], 30, 7);
    expect(dockOnly).not.toBeNull();
    expect(dockOnly!.rows.slice(0, 5)).toEqual(initial.rows.slice(0, 5));
    expect(dockOnly!.rows.slice(-2).map(row => row.trimEnd())).toEqual(["edited", "footer"]);
    expect(dockOnly!.descriptor).toMatchObject({
      frameId: 2,
      cause: "dock-input",
      verticalShiftRows: 0,
      safeVerticalShift: false,
      previousDocumentRange: initial.descriptor.nextDocumentRange,
      nextDocumentRange: initial.descriptor.nextDocumentRange,
    });
    expect(dockOnly!.selectionDamage).toMatchObject({ recomputedRows: [], reusedRows: [1, 2, 3, 4, 5] });
    expect(viewport.composeDockOnly(["wrapped", "editor", "footer"], 30, 7)).toBeNull();
    viewport.pressSelection(2, 2, 101);
    expect(viewport.composeDockOnly(["edited again", "footer"], 30, 7)).toBeNull();
  });

  it("describes initial, followed-shift, detached, geometry, selection, and reset damage without inspecting rows", () => {
    const viewport = new TranscriptViewport();
    viewport.setConfig(ALWAYS);
    const initial = viewport.compose({ documentRows: rows(10), dockRows: ["editor", "footer"], promptAnchors: [], width: 30, height: 7, now: 100 });
    expect(initial.descriptor).toEqual({
      frameId: 1,
      width: 30,
      height: 7,
      transcript: { rowStart: 1, rowEnd: 5 },
      dock: { rowStart: 6, rowEnd: 7 },
      previousDocumentRange: null,
      nextDocumentRange: { start: 5, end: 10 },
      previousFollowingEnd: null,
      followingEnd: true,
      verticalShiftRows: 0,
      safeVerticalShift: false,
      selectionRevision: 0,
      selectionDamagedRows: [1, 2, 3, 4, 5],
      cause: "initial",
    });

    const shiftedOne = viewport.compose({ documentRows: rows(11), dockRows: ["editor", "footer"], promptAnchors: [], width: 30, height: 7, now: 101 });
    expect(shiftedOne.descriptor).toMatchObject({
      frameId: 2,
      previousDocumentRange: { start: 5, end: 10 },
      nextDocumentRange: { start: 6, end: 11 },
      verticalShiftRows: 1,
      safeVerticalShift: true,
      cause: "follow-shift",
    });
    const shiftedMany = viewport.compose({ documentRows: rows(13), dockRows: ["editor", "footer"], promptAnchors: [], width: 30, height: 7, now: 102 });
    expect(shiftedMany.descriptor).toMatchObject({ verticalShiftRows: 2, safeVerticalShift: true, cause: "follow-shift" });
    const reflow = viewport.compose({
      documentRows: rows(13).map(row => `changed ${row}`),
      dockRows: ["editor", "footer"],
      promptAnchors: [],
      width: 30,
      height: 7,
      now: 102.5,
    });
    expect(reflow.descriptor).toMatchObject({ verticalShiftRows: 0, safeVerticalShift: false, cause: "steady" });

    viewport.scrollBy(-2, 103);
    const detached = viewport.compose({ documentRows: rows(14), dockRows: ["editor", "footer"], promptAnchors: [], width: 30, height: 7, now: 104 });
    expect(detached.descriptor).toMatchObject({ followingEnd: false, safeVerticalShift: false, cause: "detached" });

    const resized = viewport.compose({ documentRows: rows(14), dockRows: ["editor", "footer"], promptAnchors: [], width: 31, height: 8, now: 105 });
    expect(resized.descriptor).toMatchObject({ safeVerticalShift: false, cause: "geometry-change" });

    viewport.scrollToEnd(106);
    viewport.compose({ documentRows: rows(14), dockRows: ["editor", "footer"], promptAnchors: [], width: 31, height: 8, now: 107 });
    viewport.pressSelection(2, 2, 108);
    const selectedShift = viewport.compose({ documentRows: rows(15), dockRows: ["editor", "footer"], promptAnchors: [], width: 31, height: 8, now: 109 });
    expect(selectedShift.descriptor).toMatchObject({ verticalShiftRows: 1, safeVerticalShift: false, cause: "steady" });

    viewport.reset();
    const reset = viewport.compose({ documentRows: rows(2), dockRows: rows(5), promptAnchors: [], width: 20, height: 3, now: 110 });
    expect(reset.descriptor).toMatchObject({ transcript: null, dock: { rowStart: 1, rowEnd: 3 }, previousDocumentRange: null, cause: "initial" });
  });

  it("rejects malformed frame descriptors", () => {
    const valid: TranscriptViewportFrameDescriptor = {
      frameId: 1,
      width: 20,
      height: 6,
      transcript: { rowStart: 1, rowEnd: 4 },
      dock: { rowStart: 5, rowEnd: 6 },
      previousDocumentRange: { start: 2, end: 6 },
      nextDocumentRange: { start: 3, end: 7 },
      previousFollowingEnd: true,
      followingEnd: true,
      verticalShiftRows: 1,
      safeVerticalShift: true,
      selectionRevision: 0,
      selectionDamagedRows: [],
      cause: "follow-shift",
    };
    expect(() => assertTranscriptViewportFrameDescriptor(valid)).not.toThrow();
    expect(() => assertTranscriptViewportFrameDescriptor({ ...valid, frameId: 0 })).toThrow(/identity/);
    expect(() => assertTranscriptViewportFrameDescriptor({ ...valid, transcript: { rowStart: 1, rowEnd: 5 } })).toThrow(/overlap/);
    expect(() => assertTranscriptViewportFrameDescriptor({ ...valid, verticalShiftRows: 2 })).toThrow(/disagrees/);
    expect(() => assertTranscriptViewportFrameDescriptor({ ...valid, safeVerticalShift: true, followingEnd: false })).toThrow(/unsafe/);
    expect(() => assertTranscriptViewportFrameDescriptor({ ...valid, nextDocumentRange: { start: -1, end: 7 } })).toThrow(/next document range/);
    expect(() => assertTranscriptViewportFrameDescriptor({ ...valid, selectionRevision: -1 })).toThrow(/selection revision/);
    expect(() => assertTranscriptViewportFrameDescriptor({ ...valid, selectionDamagedRows: [2, 2] })).toThrow(/selection damage/);
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
    expect(stripAnsi(detached.rows[4] ?? "")).toContain("2 new messages (End)");

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
    expect(stripAnsi(notified.rows[6] ?? "")).toContain("Jump to bottom (End)");
  });

  it("jumps between submitted prompts in both directions", () => {
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

    expect(viewport.scrollToNextPrompt(105)).toBe(true);
    expect(viewport.scrollTop).toBe(10);
    expect(viewport.scrollToNextPrompt(106)).toBe(true);
    expect(viewport.scrollTop).toBe(20);
    expect(viewport.scrollToNextPrompt(107)).toBe(true);
    expect(viewport.scrollTop).toBe(25);
    expect(viewport.followingEnd).toBe(true);
    expect(viewport.scrollToNextPrompt(108)).toBe(false);
    expect(viewport.scrollTop).toBe(25);
    expect(viewport.followingEnd).toBe(true);

    for (const destination of [20, 10, 0]) {
      expect(viewport.scrollToPreviousPrompt(109)).toBe(true);
      expect(viewport.scrollTop).toBe(destination);
    }
    expect(viewport.scrollToPreviousPrompt(110)).toBe(false);
    for (const destination of [10, 20, 25]) {
      expect(viewport.scrollToNextPrompt(111)).toBe(true);
      expect(viewport.scrollTop).toBe(destination);
    }
    expect(viewport.followingEnd).toBe(true);
  });

  it.each([0, 12])("jumps to the bottom from a single prompt or its response at row %i", position => {
    const viewport = new TranscriptViewport();
    viewport.compose({
      documentRows: rows(20), dockRows: ["dock"], width: 36, height: 6, now: 100,
      promptAnchors: [{ id: "one", firstRow: 1, lastRow: 1, sourceRow: "❯ one" }],
    });
    viewport.scrollTo(position, 101);
    expect(viewport.followingEnd).toBe(false);
    expect(viewport.scrollToNextPrompt(102)).toBe(true);
    expect(viewport.scrollTop).toBe(15);
    expect(viewport.followingEnd).toBe(true);
  });

  it.each([0, 15])("leaves navigation without prompt anchors unchanged at row %i", position => {
    const viewport = new TranscriptViewport();
    viewport.compose({ documentRows: rows(20), dockRows: ["dock"], promptAnchors: [], width: 36, height: 6, now: 100 });
    viewport.scrollTo(position, 101);
    const following = viewport.followingEnd;
    expect(viewport.scrollToNextPrompt(102)).toBe(false);
    expect(viewport.scrollTop).toBe(position);
    expect(viewport.followingEnd).toBe(following);
  });

  it.each([4, 12])("keeps fitting and clamped prompt destinations at the bottom with %i rows", length => {
    const viewport = new TranscriptViewport();
    viewport.compose({
      documentRows: rows(length), dockRows: ["dock"], width: 36, height: 6, now: 100,
      promptAnchors: [
        { id: "one", firstRow: 1, lastRow: 1, sourceRow: "❯ one" },
        { id: "two", firstRow: length - 1, lastRow: length - 1, sourceRow: "❯ two" },
      ],
    });
    viewport.scrollTo(0, 101);
    for (let press = 0; press < 3; press += 1) {
      viewport.scrollToNextPrompt(102 + press);
      expect(viewport.scrollTop).toBe(Math.max(0, length - 5));
      expect(viewport.followingEnd).toBe(true);
    }
  });

  it("matches End state and continued following after the last prompt with pending messages", () => {
    const nextPrompt = new TranscriptViewport();
    const end = new TranscriptViewport();
    const input = {
      documentRows: rows(30), dockRows: ["dock"], width: 36, height: 6, now: 100,
      promptAnchors: [
        { id: "one", firstRow: 1, lastRow: 1, sourceRow: "❯ one" },
        { id: "two", firstRow: 20, lastRow: 20, sourceRow: "❯ two" },
      ],
    };
    for (const viewport of [nextPrompt, end]) {
      viewport.setConfig(ALWAYS);
      viewport.compose(input);
      viewport.scrollTo(20, 101);
      expect(viewport.noteNewMessage()).toBe(true);
      expect(viewport.noteNewMessage()).toBe(true);
      expect(viewport.newMessages).toBe(2);
      expect(viewport.compose({ ...input, now: 102 }).followingEnd).toBe(false);
    }

    expect(nextPrompt.scrollToNextPrompt(103)).toBe(end.scrollToEnd(103));
    for (const viewport of [nextPrompt, end]) {
      expect(viewport.scrollTop).toBe(viewport.maxScroll);
      expect(viewport.followingEnd).toBe(true);
      expect(viewport.newMessages).toBe(0);
    }
    expect(nextPrompt.compose({ ...input, now: 104 })).toEqual(end.compose({ ...input, now: 104 }));
    const grown = { ...input, documentRows: rows(35), now: 105 };
    const followed = nextPrompt.compose(grown);
    expect(followed).toEqual(end.compose(grown));
    expect(followed.scrollTop).toBe(followed.maxScroll);
    expect(followed.followingEnd).toBe(true);
    expect(followed.hits.bottom).toBeNull();
    expect(nextPrompt.noteNewMessage()).toBe(false);
    expect(nextPrompt.newMessages).toBe(0);
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

  it.each([false, true])("includes multiline boundary cells and source edges (reverse=%s)", reverse => {
    for (const scrollbarAppearance of ["always", "hidden"] as const) {
      for (const [first, last, expected] of [[2, 3, "bcd\nefgh\nijk"], [1, 4, "abcd\nefgh\nijkl"]] as const) {
        const viewport = new TranscriptViewport();
        viewport.setConfig({ scrollbarAppearance, scrollbarStyle: "thin" });
        const theme = {
          track: (text: string) => text,
          thumb: (text: string) => text,
          sticky: (text: string) => text,
          quietSticky: (text: string) => text,
          bottomControl: (text: string) => text,
          selection: (line: string, from: number, to: number) => backgroundSgrSpan(line, from, to, "\u001b[45m"),
        };
        const input = {
          documentRows: ["abcd", "efgh", "ijkl"], dockRows: ["dock"], promptAnchors: [],
          width: 10, height: 4, now: 100, theme,
        };
        viewport.compose(input);
        viewport.pressSelection(reverse ? last : first, reverse ? 3 : 1, 101);
        viewport.extendSelection(reverse ? first : last, reverse ? 1 : 3, 102, false);
        viewport.releaseSelection();
        const selected = viewport.compose({ ...input, now: 103 });
        expect(viewport.selectedText()).toBe(expected);
        expect(selected.rows[0]).toBe(backgroundSgrSpan("abcd      ", first - 1, 10, "\u001b[45m"));
        expect(selected.rows[1]).toBe(backgroundSgrSpan("efgh      ", 0, 10, "\u001b[45m"));
        expect(selected.rows[2]).toBe(backgroundSgrSpan("ijkl      ", 0, last, "\u001b[45m"));
        expect(selected.rows[3]).not.toContain("\u001b[45m");
        expect(viewport.pressSelection(1, 4, 1_000)).toBe(false);
      }
    }
  });

  it("retains a one-cell range across reversal, release, and row-cache reuse", () => {
    const viewport = new TranscriptViewport();
    const input = { documentRows: ["abcde", "unchanged"], dockRows: [], promptAnchors: [], width: 12, height: 2, now: 100 };
    viewport.compose(input);
    viewport.pressSelection(3, 1, 101);
    expect(viewport.hasSelection).toBe(false);
    const seen = new Set<string>();
    for (const [column, expected] of [[2, "bc"], [3, "c"], [4, "cd"], [3, "c"]] as const) {
      viewport.extendSelection(column, 1, 102, false);
      const frame = viewport.compose(input);
      expect(viewport.hasSelection).toBe(true);
      expect(viewport.selectedText()).toBe(expected);
      expect(frame.descriptor.selectionDamagedRows).toEqual([1]);
      expect(frame.selectionDamage.recomputedRows).toEqual(seen.has(expected) ? [] : [1]);
      expect(frame.selectionDamage.reusedRows).toContain(2);
      seen.add(expected);
    }
    viewport.releaseSelection();
    const released = viewport.compose(input);
    expect(viewport.selectedText()).toBe("c");
    expect(released.selectionDamage.recomputedRows).toEqual([]);
    viewport.clearSelection();
    expect(viewport.selectedText()).toBeNull();
  });

  it("copies source rows rather than pinned prompt, timestamp, bottom control, or dock copies", () => {
    const viewport = new TranscriptViewport();
    viewport.setConfig(ALWAYS);
    const input = {
      documentRows: ["❯ prompt                     11:45", ...rows(9)],
      promptAnchors: [{ id: "prompt", firstRow: 0, lastRow: 0, sourceRow: "❯ prompt                     11:45" }],
      dockRows: ["DOCK"], width: 40, height: 5, now: 100,
    };
    viewport.compose(input);
    viewport.scrollTo(2, 101);
    const detached = viewport.compose({ ...input, now: 102 });
    expect(detached.hits.sticky).not.toBeNull();
    expect(detached.hits.bottom).not.toBeNull();
    expect(stripAnsi(detached.rows[0]!)).toContain("prompt");
    expect(stripAnsi(detached.rows[3]!)).toContain("Jump to bottom");
    viewport.pressSelection(1, 2, 103);
    viewport.extendSelection(40, 4, 104, false);
    viewport.releaseSelection();
    expect(viewport.selectedText()).toBe("row 2\nrow 3\nrow 4");

    viewport.clearSelection();
    viewport.scrollTo(0, 105);
    viewport.compose({ ...input, now: 106 });
    viewport.pressSelection(3, 1, 1_000);
    viewport.extendSelection(40, 1, 1_001, false);
    viewport.releaseSelection();
    expect(viewport.selectedText()).toBe("prompt");
  });

  it("keeps paint-only row transforms out of transcript copying", () => {
    const viewport = new TranscriptViewport();
    const source = "https://example.com/exact";
    const input = {
      documentRows: [source],
      paintDocumentRow: (row: string) => row.replace("https://", "https:\uFE0E//"),
      dockRows: [] as string[],
      promptAnchors: [],
      width: 40,
      height: 1,
      now: 100,
    };

    const painted = viewport.compose(input);
    expect(stripAnsi(painted.rows[0] ?? "")).toContain("https:\uFE0E//example.com/exact");
    viewport.pressSelection(1, 1, 101);
    viewport.extendSelection(source.length + 1, 1, 102);
    viewport.releaseSelection();
    expect(viewport.selectedText()).toBe(source);
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

  it("keeps trailing status rows outside transcript selection and copying", () => {
    const viewport = new TranscriptViewport();
    viewport.setConfig(ALWAYS);
    const input = {
      documentRows: ["Selectable transcript", "⠋ Working..."],
      selectableDocumentRowCount: 1,
      dockRows: [] as string[],
      promptAnchors: [],
      width: 30,
      height: 2,
      now: 100,
    };
    viewport.compose(input);

    expect(viewport.pressSelection(3, 2, 101)).toBe(false);
    expect(viewport.hasSelection).toBe(false);

    expect(viewport.pressSelection(1, 1, 102)).toBe(true);
    expect(viewport.extendSelection(20, 2, 103)).toBe(true);
    viewport.releaseSelection();
    expect(viewport.selectedText()).not.toContain("Working");

    const selected = viewport.compose({
      ...input,
      now: 104,
      theme: {
        track: value => value,
        thumb: value => value,
        sticky: value => value,
        quietSticky: value => value,
        bottomControl: value => value,
        selection: line => `\u001b[45m${line}\u001b[49m`,
      },
    });
    expect(selected.rows[0]).toContain("\u001b[45m");
    expect(selected.rows[1]).not.toContain("\u001b[45m");
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
    expect(viewport.selectedText()).toBe("row 7\nrow 8\nrow 9");
    expect(stripAnsi(thumbRow).at(-1)).toBe("│");
    expect(thumbRow).toContain("\u001b[32m│");
  });

  it("reuses stable visible rows and bounds one-row multiline selection damage at 192x54", () => {
    const viewport = new TranscriptViewport();
    viewport.setConfig({ scrollbarAppearance: "hidden", scrollbarStyle: "thin" });
    const documentRows = Array.from({ length: 1_000 }, (_, index) => `row ${index} ${".".repeat(180)}`);
    const input = { documentRows, dockRows: [] as string[], promptAnchors: [], width: 192, height: 54, now: 100 };
    viewport.compose(input);
    viewport.scrollTo(0, 101);
    viewport.compose({ ...input, now: 102 });

    const stable = viewport.compose({ ...input, now: 103 });
    expect(stable.selectionDamage.recomputedRows).toEqual([]);
    expect(stable.selectionDamage.reusedRows).toHaveLength(54);
    expect(stable.descriptor.selectionDamagedRows).toEqual([]);

    viewport.pressSelection(2, 1, 104);
    viewport.extendSelection(190, 2, 105);
    let frame = viewport.compose({ ...input, now: 106 });
    expect(frame.descriptor.selectionDamagedRows).toEqual([1, 2]);
    expect(frame.selectionDamage.recomputedRows).toEqual([1, 2]);

    for (let row = 3; row <= 54; row += 1) {
      viewport.extendSelection(190, row, 106 + row);
      frame = viewport.compose({ ...input, now: 200 + row });
      expect(frame.descriptor.selectionDamagedRows.length).toBeLessThanOrEqual(2);
      expect(frame.selectionDamage.recomputedRows.length).toBeLessThanOrEqual(2);
    }
    expect(frame.selectionDamage.cacheEntries).toBeLessThanOrEqual(54 * 24);
  });

  it("invalidates only rows affected by source, selection painter, and geometry revisions", () => {
    const viewport = new TranscriptViewport();
    viewport.setConfig({ scrollbarAppearance: "hidden", scrollbarStyle: "thin" });
    const documentRows = rows(12);
    const baseTheme = {
      track: (text: string) => text,
      thumb: (text: string) => text,
      sticky: (text: string) => text,
      quietSticky: (text: string) => text,
      bottomControl: (text: string) => text,
      selection: (line: string, from: number, to: number) => backgroundSgrSpan(line, from, to, "\u001b[44m"),
    };
    const input = { documentRows, dockRows: [] as string[], promptAnchors: [], width: 30, height: 6, now: 100, theme: baseTheme };
    viewport.compose(input);
    viewport.scrollTo(0, 101);
    viewport.compose({ ...input, now: 102 });
    viewport.pressSelection(2, 2, 103);
    viewport.extendSelection(4, 3, 104);
    viewport.compose({ ...input, now: 105 });

    const changedRows = [...documentRows];
    changedRows[4] = "changed source";
    const sourceChanged = viewport.compose({ ...input, documentRows: changedRows, now: 106 });
    expect(sourceChanged.descriptor.selectionDamagedRows).toEqual([5]);
    expect(sourceChanged.selectionDamage.recomputedRows).toEqual([5]);

    const nextTheme = { ...baseTheme, selection: (line: string, from: number, to: number) => backgroundSgrSpan(line, from, to, "\u001b[45m") };
    const themeChanged = viewport.compose({ ...input, documentRows: changedRows, theme: nextTheme, now: 107 });
    expect(themeChanged.descriptor.selectionDamagedRows).toEqual([2, 3]);
    expect(themeChanged.rows[1]).toContain("\u001b[45m");
    expect(themeChanged.rows[2]).toContain("\u001b[45m");

    const resized = viewport.compose({ ...input, documentRows: changedRows, theme: nextTheme, width: 31, now: 108 });
    expect(resized.descriptor.selectionDamagedRows).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("reserves hover geometry while idle, reveals after activity, and gives hidden mode its column back", () => {
    const viewport = new TranscriptViewport();
    viewport.setConfig({ scrollbarAppearance: "auto", scrollbarStyle: "thick" });
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

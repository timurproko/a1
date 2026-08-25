import { describe, expect, it } from "vitest";
import {
  blockJumpTarget,
  blockRowSpan,
  clampScroll,
  indexOfKey,
  layoutList,
  moveSelection,
  scrollForSelection,
  selectableIndexes,
  stickyHeaderFor,
  topPaddingRows,
  visibleRowCount,
  type ListRow,
} from "../../../src/ui/components/index.js";

type Row = ListRow<string>;

const group = (name: string): Row => ({ kind: "group", group: name, title: name });
const element = (name: string, key: string, selectable = true): Row =>
  ({ kind: "element", group: name, key, selectable, value: key });
const note = (name: string, text: string): Row => ({ kind: "note", group: name, text });
const spacer: Row = { kind: "spacer" };

//  0 group A      3 spacer          7 group C (no selectable)
//  1 a1           4 group B         8 note
//  2 a2           5 note            9 spacer
//                 6 b1             10 group D
//                                  11 d1
const ROWS: readonly Row[] = [
  group("A"), element("A", "a1"), element("A", "a2"),
  spacer,
  group("B"), note("B", "read only"), element("B", "b1"),
  group("C"), note("C", "nothing here"),
  spacer,
  group("D"), element("D", "d1"),
];

describe("selection", () => {
  it("selects only selectable elements", () => {
    expect(selectableIndexes(ROWS)).toEqual([1, 2, 6, 11]);
    expect(selectableIndexes([group("A"), note("A", "x"), spacer])).toEqual([]);
  });

  it("skips an element marked unselectable", () => {
    expect(selectableIndexes([group("A"), element("A", "a1", false), element("A", "a2")])).toEqual([2]);
  });

  it("resolves a key, falling back to the first selectable row", () => {
    expect(indexOfKey(ROWS, "b1")).toBe(6);
    expect(indexOfKey(ROWS, "absent")).toBe(1);
    expect(indexOfKey(ROWS, undefined)).toBe(1);
    expect(indexOfKey([group("A"), note("A", "x")], "absent")).toBe(-1);
  });

  it("moves between selectable rows and clamps at both ends", () => {
    expect(moveSelection(ROWS, 1, 1)).toBe(2);
    expect(moveSelection(ROWS, 2, 1)).toBe(6);
    expect(moveSelection(ROWS, 1, -1)).toBe(1);
    expect(moveSelection(ROWS, 11, 1)).toBe(11);
    expect(moveSelection(ROWS, 11, -1)).toBe(6);
  });

  it("reports no selection when nothing is selectable", () => {
    expect(moveSelection([group("A"), note("A", "x")], 0, 1)).toBe(-1);
  });
});

describe("block navigation", () => {
  it("jumps forward to the next group's first element", () => {
    expect(blockJumpTarget(ROWS, 1, 1)).toBe(6);
    expect(blockJumpTarget(ROWS, 2, 1)).toBe(6);
  });

  it("skips a group with no selectable element", () => {
    expect(blockJumpTarget(ROWS, 6, 1)).toBe(11);
  });

  it("jumps backward to the current group's first element", () => {
    expect(blockJumpTarget(ROWS, 2, -1)).toBe(1);
  });

  it("jumps backward to the previous group when already at the top of its own", () => {
    expect(blockJumpTarget(ROWS, 6, -1)).toBe(1);
    expect(blockJumpTarget(ROWS, 11, -1)).toBe(6);
  });

  it("stays put at both edges rather than wrapping", () => {
    expect(blockJumpTarget(ROWS, 1, -1)).toBeUndefined();
    expect(blockJumpTarget(ROWS, 11, 1)).toBeUndefined();
  });

  it("reports the block span from its header to the row before the next", () => {
    expect(blockRowSpan(ROWS, 1)).toEqual({ from: 0, to: 3 });
    expect(blockRowSpan(ROWS, 6)).toEqual({ from: 4, to: 6 });
    expect(blockRowSpan(ROWS, 11)).toEqual({ from: 10, to: 11 });
  });

  it("finds the last group that has a selectable element", () => {
  });
});

describe("sticky headers and scrolling", () => {
  it("pins the group header while its elements are at the top", () => {
    expect(stickyHeaderFor(ROWS, 1)).toBe("A");
    expect(stickyHeaderFor(ROWS, 5)).toBe("B");
    expect(stickyHeaderFor(ROWS, 8)).toBe("C");
  });

  it("does not pin a header when the top row is itself a header or spacer", () => {
    expect(stickyHeaderFor(ROWS, 0)).toBeUndefined();
    expect(stickyHeaderFor(ROWS, 3)).toBeUndefined();
    expect(stickyHeaderFor(ROWS, 4)).toBeUndefined();
  });

  it("reserves a blank row at the top only while scrolled to the top", () => {
    expect(topPaddingRows(0)).toBe(1);
    expect(topPaddingRows(1)).toBe(0);
  });

  it("reduces the visible rows by the padding and pinned header", () => {
    expect(visibleRowCount(ROWS, 10, 0)).toBe(9);
    expect(visibleRowCount(ROWS, 10, 1)).toBe(9);
    expect(visibleRowCount(ROWS, 10, 4)).toBe(10);
    expect(visibleRowCount(ROWS, 1, 1)).toBe(1);
  });

  it("clamps scroll within the content", () => {
    expect(clampScroll(ROWS, 10, -5).scroll).toBe(0);
    expect(clampScroll(ROWS, 10, 999).scroll).toBeLessThanOrEqual(ROWS.length);
    expect(clampScroll(ROWS, 100, 5).scroll).toBe(0);
  });

  it("scrolls the least amount that reveals the selection", () => {
    expect(scrollForSelection(ROWS, 4, 0, 1)).toBe(0);
    expect(scrollForSelection(ROWS, 4, 0, 11)).toBeGreaterThan(0);
    const scrolled = scrollForSelection(ROWS, 4, 8, 1);
    expect(scrolled).toBeLessThanOrEqual(1);
  });

  it("reveals a whole block that fits the viewport", () => {
    const scroll = scrollForSelection(ROWS, 6, 0, 6, { from: 4, to: 6 });
    expect(scroll).toBeLessThanOrEqual(4);
  });

  it("shows an oversized block from its header", () => {
    const scroll = scrollForSelection(ROWS, 2, 0, 6, { from: 4, to: 9 });
    expect(scroll).toBe(4);
  });
});

describe("layout", () => {
  it("derives the frame from rows, height, and scroll", () => {
    const layout = layoutList(ROWS, 6, 0);
    expect(layout.scroll).toBe(0);
    expect(layout.topPadding).toBe(1);
    expect(layout.stickyHeader).toBeUndefined();
    expect(layout.rowIndexes[0]).toBe(0);
    expect(layout.rowIndexes.length).toBe(layout.visible);
  });

  it("accounts for the pinned header in the visible rows", () => {
    const layout = layoutList(ROWS, 6, 5);
    expect(layout.stickyHeader).toBe("B");
    expect(layout.topPadding).toBe(0);
    expect(layout.visible).toBe(5);
    expect(layout.rowIndexes[0]).toBe(5);
  });

  it("never lists a row past the end of the content", () => {
    const layout = layoutList(ROWS, 30, 0);
    expect(layout.rowIndexes.at(-1)).toBeLessThan(ROWS.length);
  });
});

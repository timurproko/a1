import { describe, expect, it } from "vitest";
import {
  ScrollbarRails,
  isThumbRow,
  scrollForThumbRow,
  scrollForTrackPage,
  scrollbarGeometry,
  scrollbarPresentation,
  scrollbarReservesSpace,
  scrollbarSelectionRows,
  scrollbarWheelRows,
  type RailPosition,
} from "../../../src/ui/components/index.js";

const TRACK = 10;

function geometry(scroll: number, contentLength = 100, viewportHeight = 20) {
  return scrollbarGeometry({ contentLength, viewportHeight, scroll, trackHeight: TRACK });
}

describe("scrollbar geometry", () => {
  it("maps normal, fast, and high to baseline, double, and combined rates", () => {
    expect(["normal", "fast", "high"].map(speed => scrollbarWheelRows(speed as "normal" | "fast" | "high")))
      .toEqual([3, 6, 9]);
    expect(["normal", "fast", "high"].map(speed => scrollbarSelectionRows(speed as "normal" | "fast" | "high")))
      .toEqual([1, 2, 3]);
  });

  it("draws nothing and reserves nothing when the content fits", () => {
    expect(scrollbarGeometry({ contentLength: 5, viewportHeight: 20, scroll: 0, trackHeight: TRACK })).toBeNull();
    expect(scrollbarGeometry({ contentLength: 20, viewportHeight: 20, scroll: 0, trackHeight: TRACK })).toBeNull();
    expect(scrollbarReservesSpace(null)).toBe(false);
  });

  it("sizes the thumb by how much of the content is in view", () => {
    expect(geometry(0)?.thumbHeight).toBe(2);
    expect(geometry(0, 40, 20)?.thumbHeight).toBe(5);
  });

  it("keeps a one-row thumb however long the content is", () => {
    const long = scrollbarGeometry({ contentLength: 100_000, viewportHeight: 20, scroll: 0, trackHeight: TRACK });
    expect(long?.thumbHeight).toBe(1);
  });

  it("moves the thumb with the scroll and stops it inside the track", () => {
    const top = geometry(0);
    const middle = geometry(40);
    const bottom = geometry(80);
    expect(top?.thumbTop).toBe(0);
    expect(middle?.thumbTop).toBeGreaterThan(0);
    expect(bottom?.thumbTop).toBe(TRACK - (bottom?.thumbHeight ?? 0));
  });

  it("clamps a scroll position beyond the content", () => {
    expect(geometry(10_000)?.thumbTop).toBe(TRACK - 2);
    expect(geometry(-10)?.thumbTop).toBe(0);
  });

  it("reports which track rows are the thumb", () => {
    const at = geometry(0);
    expect(isThumbRow(at, 0)).toBe(true);
    expect(isThumbRow(at, 1)).toBe(true);
    expect(isThumbRow(at, 2)).toBe(false);
    expect(isThumbRow(null, 0)).toBe(false);
  });

  it("turns a dragged track row into a scroll position", () => {
    const at = geometry(0);
    expect(scrollForThumbRow(at, 0)).toBe(0);
    expect(scrollForThumbRow(at, TRACK)).toBe(at?.maxScroll);
    expect(scrollForThumbRow(at, -5)).toBe(0);
    expect(scrollForThumbRow(null, 3)).toBe(0);
  });

  it("pages away from the thumb, in the direction of the click", () => {
    const at = geometry(40);
    expect(scrollForTrackPage(at, 0, 40, 20)).toBe(20);
    expect(scrollForTrackPage(at, TRACK - 1, 40, 20)).toBe(60);
    expect(scrollForTrackPage(at, TRACK - 1, 75, 20)).toBe(80);
    expect(scrollForTrackPage(null, 0, 40, 20)).toBe(40);
  });
});

const LEFT: RailPosition = { key: "left", column: 30, rowStart: 2, trackHeight: TRACK };
const RIGHT: RailPosition = { key: "right", column: 60, rowStart: 2, trackHeight: TRACK };

describe("scrollbar presentation policy", () => {
  it("covers appearance, style, hover, activity, and drag without changing geometry", () => {
    const at = geometry(20)!;
    const presentation = (overrides: Partial<Parameters<typeof scrollbarPresentation>[0]> = {}) => scrollbarPresentation({
      geometry: at,
      appearance: "hover",
      style: "thin",
      hovered: false,
      dragging: false,
      activeUntil: 0,
      now: 100,
      ...overrides,
    });
    expect(presentation()).toMatchObject({ visible: false, reservesSpace: true, trackGlyph: "│", thumbGlyph: "│" });
    expect(presentation({ hovered: true })).toMatchObject({ visible: true, thumbGlyph: "┃" });
    expect(presentation({ activeUntil: 110 })).toMatchObject({ visible: true, reservesSpace: true });
    expect(presentation({ activeUntil: 99 }).visible).toBe(false);
    expect(presentation({ dragging: true }).visible).toBe(true);
    expect(presentation({ appearance: "always" }).visible).toBe(true);
    expect(presentation({ appearance: "hidden" })).toMatchObject({ visible: false, reservesSpace: false });
    expect(presentation({ style: "thick" })).toMatchObject({ trackGlyph: "┃", thumbGlyph: "┃" });
    expect(presentation({ geometry: null })).toMatchObject({ visible: false, reservesSpace: true });
    expect(presentation({ geometry: null, appearance: "hidden" })).toMatchObject({ visible: false, reservesSpace: false });
  });
});

describe("two rails on one screen", () => {
  it("hovers only the rail the pointer is on", () => {
    const rails = new ScrollbarRails();
    expect(rails.notePointer([LEFT, RIGHT], { column: 60, row: 4 })).toBe("right");
    expect(rails.isHovered("right")).toBe(true);
    expect(rails.isHovered("left")).toBe(false);

    rails.notePointer([LEFT, RIGHT], { column: 30, row: 4 });
    expect(rails.isHovered("left")).toBe(true);
    expect(rails.isHovered("right")).toBe(false);
  });

  it("hovers neither when the pointer is off the track", () => {
    const rails = new ScrollbarRails();
    expect(rails.notePointer([LEFT, RIGHT], { column: 31, row: 4 })).toBeNull();
    expect(rails.notePointer([LEFT, RIGHT], { column: 30, row: 40 })).toBeNull();
    expect(rails.isHovered("left")).toBe(false);
  });

  it("drags only the rail the drag began on", () => {
    const rails = new ScrollbarRails();
    const at = geometry(0);
    expect(rails.beginDrag(LEFT, at, { column: 30, row: 2 })).toBe(true);
    expect(rails.isDragging("left")).toBe(true);
    expect(rails.isDragging("right")).toBe(false);
    expect(rails.draggingKey).toBe("left");

    // A report addressed to the other rail cannot continue this drag.
    expect(rails.dragTo(RIGHT, at, { column: 60, row: 8 })).toBeNull();
    expect(rails.dragTo(LEFT, at, { column: 30, row: 8 })).toBeGreaterThan(0);
  });

  it("starts no drag off the thumb or off the rail", () => {
    const rails = new ScrollbarRails();
    const at = geometry(0);
    expect(rails.beginDrag(LEFT, at, { column: 30, row: 9 })).toBe(false);
    expect(rails.beginDrag(LEFT, at, { column: 31, row: 2 })).toBe(false);
    expect(rails.beginDrag(LEFT, null, { column: 30, row: 2 })).toBe(false);
    expect(rails.draggingKey).toBeNull();
  });

  it("carries the grab offset so the thumb does not jump", () => {
    const rails = new ScrollbarRails();
    const at = geometry(0);
    // Grabbing the thumb's second row and putting it back where it was is no move.
    rails.beginDrag(LEFT, at, { column: 30, row: 3 });
    expect(rails.dragTo(LEFT, at, { column: 30, row: 3 })).toBe(0);
  });

  it("keeps recent activity independent and forgets transient state when told to", () => {
    const rails = new ScrollbarRails();
    rails.noteActivity("left", 100, 50);
    expect(rails.isRecentlyActive("left", 149)).toBe(true);
    expect(rails.isRecentlyActive("right", 149)).toBe(false);
    expect(rails.isRecentlyActive("left", 151)).toBe(false);
    rails.notePointer([LEFT], { column: 30, row: 4 });
    rails.beginDrag(LEFT, geometry(0), { column: 30, row: 2 });
    rails.endDrag();
    expect(rails.isDragging("left")).toBe(false);
    rails.clear();
    expect(rails.isHovered("left")).toBe(false);
    expect(rails.isRecentlyActive("left", 100)).toBe(false);
  });
});

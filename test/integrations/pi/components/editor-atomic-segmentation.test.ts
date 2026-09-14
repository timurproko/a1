import { describe, expect, it, vi } from "vitest";
import { createPromptSelectionInterceptor } from "../../../../src/integrations/pi/components/owned-editor-ux.js";

type Transform = (text: string, mode: "word" | "grapheme", segments: Iterable<Intl.SegmentData>) => Iterable<Intl.SegmentData>;
function transformForChips(): Transform {
  let transform!: Transform;
  // Rationale: capture the existing typed interaction hook; these tests exercise segmentation only.
  createPromptSelectionInterceptor({ interaction: { setSegmentTransform(value: Transform) { transform = value; } } } as never, {} as never, {
    atomicRanges: (text: string) => [...text.matchAll(/\[(?:📄|🔗|📷) [^\]]+\]/gu)].map(match => ({ start: match.index, end: match.index + match[0].length })),
  } as never);
  return transform;
}
const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

describe("indexed owned atomic segmentation", () => {
  it.each([
    "plain words",
    "left [📄 file.txt] right",
    "[📄 first][📄 second]",
    "界👩‍💻é [🔗 https://example.com/] tail",
    "before [📄 file]́[📄 next] after",
    "\u0600[📄 file] after",
    "[📷 screenshot]‍👩‍💻 tail",
  ])("matches the existing iterable semantics (case %#)", text => {
    const transform = transformForChips();
    const native = segmenter.segment(text);
    expect([...transform(text, "grapheme", native)]).toEqual([...transform(text, "grapheme", [...native])]);
  });

  it("does bounded boundary work per chip instead of enumerating discarded interior graphemes", () => {
    const text = "[📄 ".concat("x".repeat(250), "]").repeat(1000);
    const segments = segmenter.segment(text);
    const containing = vi.fn((offset: number) => segments.containing(offset));
    const iterator = vi.fn(() => { throw new Error("unexpected full grapheme enumeration"); });
    const result = [...transformForChips()(text, "grapheme", { containing, [Symbol.iterator]: iterator } as Iterable<Intl.SegmentData>)];
    expect(result).toHaveLength(1000);
    expect(containing).toHaveBeenCalledTimes(2000);
    expect(iterator).not.toHaveBeenCalled();
    expect(result.map(value => value.segment.replaceAll("\uE000", " ")).join("") === text).toBe(true);
  });

  it("falls back to iterable semantics when a provider cannot locate a boundary", () => {
    const text = "before [📄 file] after", segments = segmenter.segment(text);
    const values = { containing: () => undefined, [Symbol.iterator]: () => segments[Symbol.iterator]() };
    const transform = transformForChips();
    expect([...transform(text, "grapheme", values)]).toEqual([...transform(text, "grapheme", [...segments])]);
  });
});

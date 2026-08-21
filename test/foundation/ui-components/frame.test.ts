import { describe, expect, it } from "vitest";
import {
  FrameCache,
  FrameContractError,
  RenderRevisionTracker,
  assertPaneRect,
  finalizeFrame,
  normalizeRevisions,
  validateFrame,
} from "../../../src/foundation/ui-components/index.js";

const RECT = { width: 10, height: 3 };

describe("frame contract", () => {
  it("accepts a frame that fills its rectangle exactly", () => {
    expect(() => validateFrame(["one", "two", "three"], RECT)).not.toThrow();
  });

  it("rejects the wrong row count and names the pane", () => {
    expect(() => validateFrame(["one", "two"], RECT, "settings")).toThrow(FrameContractError);
    expect(() => validateFrame(["one", "two"], RECT, "settings"))
      .toThrow(/settings: rendered 2 rows for a height of 3/);
    expect(() => validateFrame(["a", "b", "c", "d"], RECT)).toThrow(/rendered 4 rows/);
  });

  it("rejects an over-wide row by display width, not code units", () => {
    expect(() => validateFrame(["世界世界世界", "", ""], RECT)).toThrow(/12 columns wide/);
    expect(() => validateFrame(["世界世界世", "", ""], RECT)).not.toThrow();
  });

  it("does not count styling as visible width", () => {
    expect(() => validateFrame(["[31mred[0m", "", ""], RECT)).not.toThrow();
  });

  it("rejects an embedded line break", () => {
    expect(() => validateFrame(["a\nb", "", ""], RECT)).toThrow(/row 0 contains a line break/);
    expect(() => validateFrame(["a\rb", "", ""], RECT)).toThrow(/line break/);
  });

  it("rejects an invalid rectangle", () => {
    for (const rect of [{ width: -1, height: 1 }, { width: 1, height: 1.5 }, { width: 20_000, height: 1 }]) {
      expect(() => assertPaneRect(rect, "pane")).toThrow(/must be an integer between 0 and 10000/);
    }
  });
});

describe("finalizing a frame", () => {
  it("pads a short body with blank rows", () => {
    expect(finalizeFrame(["one"], RECT)).toEqual(["one", "", ""]);
  });

  it("drops rows beyond the rectangle", () => {
    expect(finalizeFrame(["a", "b", "c", "d"], RECT)).toEqual(["a", "b", "c"]);
  });

  it("truncates an over-wide row instead of corrupting the layout", () => {
    const [first] = finalizeFrame(["abcdefghijklmno"], RECT);
    expect(first).toBe("abcdefghij");
    expect(() => validateFrame(finalizeFrame(["abcdefghijklmno"], RECT), RECT)).not.toThrow();
  });

  it("still refuses a row containing a line break", () => {
    expect(() => finalizeFrame(["a\nb"], RECT)).toThrow(/line break/);
  });
});

describe("declared invalidation", () => {
  const componentWith = (tracker: RenderRevisionTracker) => ({ renderCache: { revisions: () => tracker.revisions() } });

  it("normalizes a partial or absent declaration", () => {
    expect(normalizeRevisions(undefined)).toEqual({ content: 0, selection: 0, hover: 0, layout: 0, theme: 0 });
    expect(normalizeRevisions({ content: 3 })).toEqual({ content: 3, selection: 0, hover: 0, layout: 0, theme: 0 });
    expect(normalizeRevisions({ content: Number.NaN })).toEqual({ content: 0, selection: 0, hover: 0, layout: 0, theme: 0 });
  });

  it("reuses the cached frame while nothing changes", () => {
    const cache = new FrameCache();
    const component = componentWith(new RenderRevisionTracker());
    let renders = 0;
    const render = () => { renders += 1; return ["a", "b", "c"]; };

    expect(cache.render(component, RECT, render)).toEqual(["a", "b", "c"]);
    expect(cache.render(component, RECT, render)).toEqual(["a", "b", "c"]);
    expect(renders).toBe(1);
    expect(cache.hits).toBe(1);
  });

  it("discards the cache when any declared revision changes", () => {
    for (const kind of ["content", "selection", "hover", "layout", "theme"] as const) {
      const cache = new FrameCache();
      const tracker = new RenderRevisionTracker();
      const component = componentWith(tracker);
      let renders = 0;
      const render = () => { renders += 1; return ["a", "b", "c"]; };

      cache.render(component, RECT, render);
      tracker.bump(kind);
      cache.render(component, RECT, render);
      expect(renders, `${kind} should invalidate`).toBe(2);
    }
  });

  it("discards the cache when the rectangle changes", () => {
    const cache = new FrameCache();
    const component = componentWith(new RenderRevisionTracker());
    let renders = 0;
    const render = () => { renders += 1; return ["a", "b", "c"]; };

    cache.render(component, RECT, render);
    cache.render(component, { width: 11, height: 3 }, render);
    cache.render(component, { width: 11, height: 4 }, render);
    expect(renders).toBe(3);
  });

  it("never caches a component that declares no contract", () => {
    const cache = new FrameCache();
    let renders = 0;
    const render = () => { renders += 1; return ["a", "b", "c"]; };

    cache.render({}, RECT, render);
    cache.render({}, RECT, render);
    expect(renders).toBe(2);
    expect(cache.hits).toBe(0);
  });

  it("drops the cache on explicit invalidation", () => {
    const cache = new FrameCache();
    const component = componentWith(new RenderRevisionTracker());
    let renders = 0;
    const render = () => { renders += 1; return ["a", "b", "c"]; };

    cache.render(component, RECT, render);
    cache.invalidate();
    cache.render(component, RECT, render);
    expect(renders).toBe(2);
  });
});

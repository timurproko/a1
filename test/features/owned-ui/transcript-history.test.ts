import { describe, expect, it } from "vitest";
import type { OwnedUiTranscriptBlock } from "../../../src/foundation/owned-ui-contracts/index.js";
import { OwnedTranscriptComponent, OwnedTranscriptHistory } from "../../../src/features/owned-ui/index.js";

function block(id: string, text: string, status: "live" | "finalized", revision = 1): OwnedUiTranscriptBlock {
  return {
    id,
    kind: "assistant",
    status,
    revision,
    title: null,
    text,
    payload: {},
  };
}

function renderText(value: OwnedUiTranscriptBlock, width: number): readonly string[] {
  const rows: string[] = [];
  for (let offset = 0; offset < value.text.length; offset += width) rows.push(value.text.slice(offset, offset + width));
  return rows.length > 0 ? rows : [""];
}

describe("owned transcript history", () => {
  it("commits finalized rows once and keeps live rows outside the append-only prefix", () => {
    const history = new OwnedTranscriptHistory(10, renderText);
    const first = block("one", "first", "finalized");
    const live = block("live", "stream", "live");

    const initial = history.render([first, live]);
    expect(initial.fullPaint).toBe(true);
    expect(initial.committedRows).toEqual(["first"]);
    expect(initial.liveRows).toEqual(["stream"]);

    const cached = history.render([first, live]);
    expect(cached.fullPaint).toBe(false);
    expect(cached.committedRows[0]).toBe(initial.committedRows[0]);

    const finished = history.render([first, { ...live, status: "finalized", revision: 2 }]);
    expect(history.committedRowCount).toBe(2);
    expect(finished.committedRows).toEqual(["first", "stream"]);
    expect(finished.liveRows).toEqual([]);
  });

  it("preserves streaming updates in the live region until the block finalizes", () => {
    const history = new OwnedTranscriptHistory(8, renderText);
    const first = block("one", "done", "finalized");
    const live = block("live", "hello", "live");

    history.render([first, live]);
    const updated = history.render([first, { ...live, text: "hello world", revision: 2 }]);
    expect(updated.committedRows).toEqual(["done"]);
    expect(updated.liveRows).toEqual(["hello wo", "rld"]);
    expect(history.committedRowCount).toBe(1);

    const finalized = history.render([first, { ...live, text: "hello world", status: "finalized", revision: 3 }]);
    expect(finalized.committedRows).toEqual(["done", "hello wo", "rld"]);
  });

  it("handles long output and Unicode through the renderer width boundary", () => {
    const history = new OwnedTranscriptHistory(4, renderText);
    const longText = `${"x".repeat(100)}界🙂`;
    const frame = history.render([block("long", longText, "live")]);
    expect(frame.liveRows.length).toBeGreaterThan(20);
    expect(frame.liveRows.some(row => row.includes("界"))).toBe(true);
    expect(frame.liveRows.some(row => row.includes("🙂"))).toBe(true);
  });

  it("requires a full repaint after resize or a finalized block revision", () => {
    const rendered: string[] = [];
    const history = new OwnedTranscriptHistory(5, (value, width) => {
      rendered.push(`${value.id}:${width}:${value.revision}`);
      return renderText(value, width);
    });
    const first = block("one", "abcdef", "finalized");
    const initial = history.render([first]);
    expect(initial.fullPaint).toBe(true);
    expect(history.render([first]).fullPaint).toBe(false);

    const resized = history.render([first], 3);
    expect(resized.fullPaint).toBe(true);
    expect(resized.committedRows).toEqual(["abc", "def"]);

    const revised = history.render([{ ...first, revision: 2 }], 3);
    expect(revised.fullPaint).toBe(true);
    expect(rendered).toEqual(["one:5:1", "one:3:1", "one:3:2"]);
  });

  it("supports targeted invalidation without fabricating committed history", () => {
    const history = new OwnedTranscriptHistory(10, renderText);
    const first = block("one", "first", "finalized");
    const second = block("two", "second", "live");
    history.render([first, second]);
    history.invalidate("two");
    const frame = history.render([first, { ...second, revision: 2 }]);
    expect(frame.fullPaint).toBe(true);
    expect(frame.committedRows).toEqual(["first"]);
    expect(frame.liveRows).toEqual(["second"]);
    expect(history.committedRowCount).toBe(1);
  });

  it("presents the append-only transcript through the terminal component seam", () => {
    const component = new OwnedTranscriptComponent(10, renderText);
    let requested = 0;
    component.setRenderRequestHandler(() => {
      requested += 1;
    });
    component.setBlocks([block("one", "one", "finalized"), block("two", "two", "live")]);
    expect(requested).toBe(1);
    expect(component.render({ columns: 10, rows: 2 })).toEqual(["one", "two"]);
    component.setBlocks([block("one", "one", "finalized"), block("two", "two", "finalized", 2)]);
    expect(component.render({ columns: 10, rows: 1 })).toEqual(["two"]);
  });
});

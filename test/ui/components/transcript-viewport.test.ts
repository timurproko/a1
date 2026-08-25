import { describe, expect, it } from "vitest";
import {
  TranscriptViewport,
  composeTimestampedPromptRows,
  stripAnsi,
  type TranscriptViewportDocument,
  type TranscriptViewportTheme,
} from "../../../src/ui/components/index.js";

const theme: TranscriptViewportTheme = {
  scrollbar: glyph => glyph,
  bottomControl: text => text,
  stickyPrompt: (row, quiet) => quiet ? `quiet:${row}` : `sticky:${row}`,
};

function document(rows: readonly string[], prompts: TranscriptViewportDocument["prompts"] = []) {
  return (_width: number): TranscriptViewportDocument => ({ rows, prompts });
}

function render(
  viewport: TranscriptViewport,
  rows: readonly string[],
  options: { readonly prompts?: TranscriptViewportDocument["prompts"]; readonly appearance?: "always" | "hover" | "hidden"; readonly now?: number } = {},
) {
  return viewport.render({
    width: 20,
    height: 6,
    dockRows: ["editor", "footer"],
    renderDocument: document(rows, options.prompts),
    appearance: options.appearance ?? "hover",
    style: "thin",
    speed: "normal",
    theme,
    now: options.now ?? 0,
  });
}

describe("timestamped prompt rows", () => {
  it("reserves before wrapping and omits only the timestamp at narrow widths", () => {
    const source = new Date(2024, 0, 1, 9, 7);
    const wide = composeTimestampedPromptRows({
      width: 30,
      sourceTimestamp: source,
      render: width => [`prompt@${width}`],
    });
    expect(wide[0]).toContain("prompt@23");
    expect(wide[0]).toMatch(/09:07$/);
    expect(composeTimestampedPromptRows({
      width: 15,
      sourceTimestamp: source,
      render: width => [`prompt@${width}`],
    })).toEqual(["prompt@15"]);
  });
});

describe("TranscriptViewport", () => {
  it("returns one exact-height frame and keeps the dock pinned while following", () => {
    const viewport = new TranscriptViewport();
    const frame = render(viewport, ["0", "1", "2", "3", "4", "5"]);
    expect(frame).toHaveLength(6);
    expect(frame.slice(-2)).toEqual(["editor", "footer"]);
    expect(stripAnsi(frame[0] ?? "")).toContain("2");
    expect(viewport.state).toMatchObject({ scrollTop: 2, viewportHeight: 4, followingEnd: true, overflowing: true });
  });

  it("stays detached while rows stream and resumes at the bottom control", () => {
    const viewport = new TranscriptViewport();
    render(viewport, ["0", "1", "2", "3", "4", "5"]);
    viewport.onMouse({ kind: "wheel-up", button: 0, column: 5, row: 2 }, 10);
    render(viewport, ["0", "1", "2", "3", "4", "5", "6"], { now: 11 });
    expect(viewport.state.scrollTop).toBe(0);
    expect(viewport.state.followingEnd).toBe(false);

    const activated = viewport.onMouse({ kind: "press", button: 0, column: 15, row: 4 }, 12);
    expect(activated.consumed).toBe(true);
    render(viewport, ["0", "1", "2", "3", "4", "5", "6"], { now: 13 });
    expect(viewport.state).toMatchObject({ scrollTop: 3, followingEnd: true });
  });

  it("pins the governing prompt and returns to its semantic source", () => {
    const viewport = new TranscriptViewport();
    const rows = ["before", "prompt", "continued", "answer", "later", "tail"];
    const prompts = [{ id: "p", start: 1, end: 2, firstRow: "prompt 12:34" }];
    const frame = render(viewport, rows, { prompts });
    expect(stripAnsi(frame[0] ?? "")).toContain("sticky:prompt 12:34");

    expect(viewport.onMouse({ kind: "press", button: 0, column: 3, row: 1 }).consumed).toBe(true);
    render(viewport, rows, { prompts });
    expect(viewport.state.scrollTop).toBe(1);
    expect(viewport.state.followingEnd).toBe(false);
  });

  it("selects transcript text with an ordinary LMB drag and returns clipboard text", () => {
    const viewport = new TranscriptViewport();
    render(viewport, ["alpha", "bravo", "charlie", "delta"]);

    expect(viewport.onMouse({ kind: "press", button: 0, column: 1, row: 1 }).consumed).toBe(true);
    expect(viewport.onMouse({ kind: "motion", button: 0, column: 4, row: 2 }).consumed).toBe(true);
    const selected = render(viewport, ["alpha", "bravo", "charlie", "delta"]);
    expect(selected.join("\n")).toContain("\u001b[107;30m");
    const released = viewport.onMouse({ kind: "release", button: 0, column: 4, row: 2 });
    expect(released).toMatchObject({ consumed: true, copyText: "alpha\nbrav" });
  });

  it("uses a fixed white selection background and supports double-word and triple-line selection", () => {
    const viewport = new TranscriptViewport();
    const rows = ["one two three", "next"];
    render(viewport, rows);
    const pointer = { button: 0, column: 5, row: 1 } as const;

    viewport.onMouse({ kind: "press", ...pointer }, 100);
    viewport.onMouse({ kind: "release", ...pointer }, 110);
    viewport.onMouse({ kind: "press", ...pointer }, 200);
    const wordFrame = render(viewport, rows);
    expect(wordFrame.join("\n")).toContain("\u001b[107;30mtwo\u001b[39;49m");
    expect(viewport.onMouse({ kind: "release", ...pointer }, 210).copyText).toBe("two");

    viewport.onMouse({ kind: "press", ...pointer }, 300);
    expect(viewport.onMouse({ kind: "release", ...pointer }, 310).copyText).toBe("one two three");
  });

  it("scrolls three lines at normal speed and six at high speed", () => {
    const rows = Array.from({ length: 20 }, (_, index) => String(index));
    const normal = new TranscriptViewport();
    render(normal, rows);
    const normalBefore = normal.state.scrollTop;
    normal.onMouse({ kind: "wheel-up", button: 0, column: 3, row: 2 });
    expect(normal.state.scrollTop).toBe(normalBefore - 3);

    const high = new TranscriptViewport();
    high.render({
      width: 20,
      height: 6,
      dockRows: ["editor", "footer"],
      renderDocument: document(rows),
      appearance: "hover",
      style: "thin",
      speed: "high",
      theme,
      now: 0,
    });
    const highBefore = high.state.scrollTop;
    high.onMouse({ kind: "wheel-up", button: 0, column: 3, row: 2 });
    expect(high.state.scrollTop).toBe(highBefore - 6);
  });

  it("reserves and reveals a hover rail without changing wheel distance", () => {
    const viewport = new TranscriptViewport();
    const rows = Array.from({ length: 10 }, (_, index) => String(index));
    render(viewport, rows, { now: 2_000 });
    expect(viewport.state.scrollbarVisible).toBe(false);
    const before = viewport.state.scrollTop;
    viewport.onMouse({ kind: "motion", button: 0, column: 20, row: 2 }, 2_001);
    render(viewport, rows, { now: 2_002 });
    expect(viewport.state.scrollbarVisible).toBe(true);
    viewport.onMouse({ kind: "wheel-up", button: 0, column: 3, row: 2 }, 2_003);
    expect(viewport.state.scrollTop).toBe(before - 3);
  });

  it("draws and exposes no rail in hidden mode", () => {
    const viewport = new TranscriptViewport();
    const frame = render(viewport, ["0", "1", "2", "3", "4", "5"], { appearance: "hidden" });
    expect(viewport.state.scrollbarVisible).toBe(false);
    expect(frame.every(row => !stripAnsi(row).includes("│") && !stripAnsi(row).includes("┃"))).toBe(true);
    // The former rail cell is ordinary selectable transcript content, not a scrollbar hit.
    expect(viewport.onMouse({ kind: "press", button: 0, column: 20, row: 1 }).consumed).toBe(true);
    expect(viewport.onMouse({ kind: "release", button: 0, column: 20, row: 1 }).copyText).toBeUndefined();
  });
});

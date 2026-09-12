import { describe, expect, it } from "vitest";
import type { OwnedUiSessionViewModel } from "../../../../src/contracts/owned-ui/index.js";
import { applyPiTheme, piTheme } from "../../../../src/integrations/pi/components/index.js";
import { OwnedUiSessionShellRoot } from "../../../../src/integrations/pi/session-ui/session-shell-root.js";
import { stripAnsi } from "../../../../src/ui/components/index.js";
import { BottomHoverEvidence, classifyBottomHoverFinding } from "../../../support/rendering/bottom-hover-evidence.js";

function fixture(length = 20) {
  applyPiTheme("dark", false, "truecolor");
  const view: OwnedUiSessionViewModel = {
    contractVersion: 1, sessionId: "hover", revision: 1, lifecycle: "ready",
    transcript: Array.from({ length }, (_, index) => ({
      id: `row-${index}`, kind: "assistant", status: "finalized", revision: 1,
      title: null, text: `reply ${index}`, payload: {},
    })),
    editor: { text: "", queuedSubmissions: [], selection: null, cursorOffset: 0, historyRevision: 0, submitEnabled: true },
    status: { title: "Pi", workingMessage: null, diagnostics: [], badges: [] },
    terminal: { columns: 60, rows: 16, focusedRegion: "editor", hardwareCursor: false },
    activeModel: null, thinkingLevel: "medium", activeCommandIds: [], dialog: null, overlay: null,
    customizations: [], diagnostics: [],
  };
  const renders: (boolean | undefined)[] = [];
  const geometry = { columns: 60, rows: 16 };
  let onFrame: (() => void) | undefined;
  const root = new OwnedUiSessionShellRoot(view, "D:/work", {
    getColumns: () => geometry.columns, getRows: () => geometry.rows,
    requestRender: force => renders.push(force), onViewportFrame: () => onFrame?.(),
    onSubmit() {}, onInterrupt() {}, onExit() {}, onModelSelect() {}, onThinkingCycle() {},
  }, { quiet: true }, undefined, undefined, "custom-viewport");
  const render = () => root.render(geometry.columns);
  render();
  const row = root.viewportFrameDescriptor()!.transcript!.rowEnd;
  const mouse = (code: number, column = 30, atRow = row) => root.handleViewportPreInput(`\u001b[<${code};${column};${atRow}M`);
  const hover = (rows: readonly string[], expected: boolean) => {
    const control = rows.find(line => /Jump to bottom|new messages?/.test(stripAnsi(line)));
    expect(control).toBeDefined();
    const color = piTheme().bg(expected ? "selectedBg" : "toolPendingBg", " ").split(" ")[0];
    expect(control).toContain(color);
  };
  return { root, view, renders, geometry, render, mouse, hover, row, onFrame: (value: (() => void) | undefined) => { onFrame = value; } };
}

describe("bottom-control composition provenance", () => {
  it.each([true, false])("uses current hover on the first composed frame, then safe reuse (enter=%s)", entering => {
    const f = fixture();
    try {
      f.mouse(64, entering ? 1 : 30); f.render();
      const before = f.root.transcriptRenderCount();
      f.root.handleInput("x"); f.mouse(35, entering ? 30 : 1);
      const pending = f.root.viewportPresentationEvidence();
      expect(pending.currentRevision).toBeGreaterThan(pending.candidateRevision!);
      f.hover(f.render(), entering);
      const current = f.root.viewportPresentationEvidence();
      expect(current.composedRevision).toBe(current.currentRevision);
      expect(current.composedPointer).toEqual(current.currentPointer);
      const composed = f.root.viewportCompositionEvidence();
      f.root.handleInput("y"); f.hover(f.render(), entering);
      expect(f.root.viewportCompositionEvidence()).toEqual({ full: composed.full, dockOnly: composed.dockOnly + 1 });
      expect(f.root.transcriptRenderCount()).toBe(before);
      expect(f.root.editor.getText()).toBe("xy");
    } finally { f.root.dispose(); }
  });

  it.each([20, 500])("keeps settled dock-only work bounded after hover in a %s-block transcript", length => {
    const f = fixture(length);
    try {
      f.mouse(64); f.hover(f.render(), true);
      const before = f.root.viewportCompositionEvidence();
      const blockRenders = f.root.transcriptRenderCount();
      for (const character of ["a", "b", "c"]) { f.root.handleInput(character); f.hover(f.render(), true); }
      expect(f.root.viewportCompositionEvidence()).toEqual({ full: before.full, dockOnly: before.dockOnly + 3 });
      expect(f.root.transcriptRenderCount()).toBe(blockRenders);
    } finally { f.root.dispose(); }
  });

  it("keeps same-height content changes current and only rerenders the changed block", () => {
    const f = fixture();
    try {
      f.mouse(64); f.render();
      const before = f.root.transcriptRenderCount();
      f.root.handleInput("x");
      // Invariant: this block is visible in the detached frame and its new text has the same height.
      f.root.applyTranscriptBlock({ ...f.view.transcript[16]!, text: "NEW CONTENT", revision: 2 });
      const rows = f.render();
      expect(rows.some(row => stripAnsi(row).includes("NEW CONTENT"))).toBe(true);
      expect(f.root.transcriptRenderCount()).toBe(before + 1);
      f.hover(rows, true);
      f.root.handleInput("y");
      expect(f.render().some(row => stripAnsi(row).includes("NEW CONTENT"))).toBe(true);
      expect(f.root.viewportFrameDescriptor()!.cause).toBe("dock-input");
    } finally { f.root.dispose(); }
  });

  it("applies interleaved wheel actions and retains only the latest pointer state", () => {
    const f = fixture();
    try {
      f.root.handleInput("a"); f.mouse(64, 1); f.mouse(35); f.hover(f.render(), true);
      const top = f.root.viewportPresentationEvidence().scrollTop;
      f.root.handleInput("b"); f.mouse(64); f.mouse(35, 1); f.mouse(35);
      f.hover(f.render(), true);
      expect(f.root.viewportPresentationEvidence().scrollTop).toBe(top - 3);
      f.root.handleInput("c");
      f.root.handleViewportPreInput("\u001b[1;5F");
      expect(f.render().some(line => line.includes("Jump to bottom"))).toBe(false);
      expect(f.root.viewportPresentationEvidence().followingEnd).toBe(true);
      // Invariant: reverse ordering (hover before keyboard receipt) is also current.
      f.mouse(64); f.root.handleInput("d"); f.hover(f.render(), true);
      f.root.handleInput("e"); f.root.clearViewportPointerState(); f.hover(f.render(), false);
      expect(f.root.viewportPresentationEvidence().currentPointer).toBeNull();
    } finally { f.root.dispose(); }
  });

  it("recomputes label, dock movement, resize, and transient content before reusing", () => {
    const f = fixture();
    try {
      f.mouse(64); f.render();
      f.root.handleInput("x"); f.root.noteCompletedAssistantMessage();
      let rows = f.render();
      expect(rows.some(line => stripAnsi(line).includes("1 new message (Ctrl+End) ↓"))).toBe(true);
      f.hover(rows, true);
      f.root.handleInput("y"); f.root.editor.setText("one\ntwo\nthree"); f.hover(f.render(), false);
      f.root.editor.setText(""); f.hover(f.render(), true);
      f.root.handleInput("z"); f.geometry.columns = 100; f.hover(f.render(), false);
      f.geometry.columns = 60; f.render();
      f.root.handleInput("q");
      f.root.update({ ...f.view, lifecycle: "busy", status: { ...f.view.status, workingMessage: "Working" } });
      rows = f.render();
      expect(f.root.viewportFrameDescriptor()!.transientRowCount).toBeGreaterThan(0);
      expect(f.root.viewportFrameDescriptor()!.cause).not.toBe("dock-input");
      expect(rows).toHaveLength(16);
    } finally { f.root.dispose(); }
  });

  it("does not acknowledge a newer callback input with the frame being published", () => {
    const f = fixture();
    try {
      f.mouse(64); f.render(); f.renders.length = 0;
      f.onFrame(() => { f.onFrame(undefined); f.mouse(35, 1); });
      f.root.handleInput("x"); f.hover(f.render(), true);
      const interrupted = f.root.viewportPresentationEvidence();
      expect(interrupted.composedRevision).toBeLessThan(interrupted.currentRevision);
      expect(f.renders).toContain(false);
      f.root.handleInput("y"); f.hover(f.render(), false);
      const latest = f.root.viewportPresentationEvidence();
      expect(latest.composedRevision).toBe(latest.currentRevision);
      f.renders.length = 0; f.render(); expect(f.renders).toEqual([]);
    } finally { f.root.dispose(); }
  });
});

describe("bounded bottom-hover diagnostics", () => {
  it("is disabled by default and only records explicitly enabled whitelisted metadata", () => {
    const f = fixture();
    try {
      const disabled = new BottomHoverEvidence();
      const state = { ...f.root.viewportPresentationEvidence(), secret: "credential-sentinel" };
      disabled.input("private-editor-text\u001b[<35;30;10M", true, state);
      disabled.composition(state); disabled.paint(state, false);
      expect(disabled.snapshot()).toEqual({ events: [], seen: 0, truncated: false });
      let clock = 10;
      const capture = new BottomHoverEvidence({ enabled: true, limit: 3, now: () => clock++ });
      capture.input("private-editor-text", false, state);
      capture.input("private-editor-text\u001b[<35;30;10M", true, state);
      capture.composition(state); capture.paint(state, false); capture.composition(state);
      const result = capture.snapshot();
      expect(result).toMatchObject({ seen: 4, truncated: true });
      expect(result.events.map(event => event.sequence)).toEqual([1, 2, 3]);
      expect(result.events.map(event => event.atMs)).toEqual([1, 2, 3]);
      expect(result.events[0]).toMatchObject({ phase: "input", consumed: true, mouse: { kind: "motion", column: 30, row: 10 } });
      expect(JSON.stringify(result)).not.toMatch(/private-editor-text|credential-sentinel|reply/);
      expect(() => new BottomHoverEvidence({ limit: 0 })).toThrow(RangeError);
      expect(() => new BottomHoverEvidence({ limit: Infinity })).toThrow(RangeError);
    } finally { f.root.dispose(); }
  });

  it.each([
    [false, true, true, true, true, "inconclusive"],
    [true, false, true, true, true, "inconclusive"],
    [true, true, false, false, false, "missing-report"],
    [true, true, true, false, false, "stale-composition"],
    [true, true, true, true, false, "incorrect-paint"],
    [true, true, true, true, true, "physical-only"],
  ] as const)("classifies complete=%s failure=%s report=%s composition=%s paint=%s as %s", (complete, failureObserved, reportObserved, compositionMatches, paintMatches, expected) => {
    expect(classifyBottomHoverFinding({ complete, failureObserved, reportObserved, compositionMatches, paintMatches })).toBe(expected);
  });
});

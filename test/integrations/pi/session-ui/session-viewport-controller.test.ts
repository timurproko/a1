import { describe, expect, it, vi } from "vitest";
import { backgroundSgrSpan, stripAnsi } from "../../../../src/ui/components/index.js";
import type { PiShellEditorPointerEvent, PiShellEditorPort } from "../../../../src/integrations/pi/components/index.js";
import { SessionViewportController } from "../../../../src/integrations/pi/session-ui/session-viewport-controller.js";

function editor(overrides: Partial<PiShellEditorPort> = {}): PiShellEditorPort {
  return {
    render: () => [],
    invalidate() {},
    activateKeybindings() {},
    keybindingConfig: () => ({}),
    reloadKeybindings() {},
    matchesTerminalKey: (data, key) => data === key,
    getText: () => "",
    setText() {},
    insertText() {},
    addToHistory() {},
    setSubmitEnabled() {},
    setSubmitHandler() {},
    setInterruptHandler() {},
    setAutocompleteCommands() {},
    setPaddingX() {},
    setAutocompleteMaxVisible() {},
    addAutocompleteProvider() {},
    setThinkingLevel() {},
    setPromptSuggestion() {},
    canPresentPromptSuggestion: () => false,
    hasSelection: () => false,
    ownsPointer: () => false,
    handlePointer: () => false,
    pasteClipboard: () => false,
    ...overrides,
  };
}

function frame(controller: SessionViewportController, length = 20): readonly string[] {
  return controller.compose({
    documentRows: Array.from({ length }, (_row, index) => `row-${index}`),
    dockRows: [],
    promptAnchors: [],
    width: 20,
    height: 5,
  }).rows.map(row => stripAnsi(row).trimEnd());
}

function hoverFixture() {
  const renders: (boolean | undefined)[] = [];
  const cleanups = vi.fn();
  const target = new SessionViewportController({
    enabled: true, editor: editor(), requestRender: force => renders.push(force), requestHyperlinkCleanup: cleanups,
  });
  const input = {
    documentRows: Array.from({ length: 30 }, (_, index) => `row-${index}`),
    dockRows: ["dock"], promptAnchors: [], width: 40, height: 8,
    theme: {
      track: (text: string) => text,
      thumb: (text: string) => text,
      sticky: (text: string) => text,
      quietSticky: (text: string) => text,
      bottomControl: (text: string, hovered: boolean) => `\u001b[${hovered ? 46 : 45}m${text}\u001b[49m`,
      selection: (text: string) => text,
    },
  };
  const compose = () => target.compose(input);
  compose();
  return { target, input, compose, renders, cleanups };
}

describe("session viewport interaction controller", () => {
  it.each(["replacement", "overlay"])("keeps transcript selection and wheel ownership with a %s open", kind => {
    const hiddenEditor = editor({ pasteClipboard: vi.fn(() => true), hasSelection: () => true, activateKeybindings: vi.fn() });
    const received: string[] = [];
    const component = { render: () => ["modal"], invalidate() {}, handleInput: (data: string) => received.push(data) };
    const target = new SessionViewportController({ enabled: true, editor: hiddenEditor, requestRender() {} });
    const region = { component, rowStart: 4, rowEnd: 5, columnStart: 1, columnEnd: 20 };
    if (kind === "replacement") target.setInputSurfaceFrame(region);
    else target.setOverlaySurfaces([region]);
    frame(target, 30);
    const input = (data: string) => target.handlePreInput(data, true, Date.now(), false);
    const before = target.frame!.scrollTop;
    expect(input("\u001b[<64;2;2M").consumed).toBe(true);
    frame(target, 30);
    expect(target.frame!.scrollTop).toBe(before - 3);
    input("\u001b[<64;2;4M");
    expect(received).toEqual(["\u001b[<64;2;4M"]);
    expect(input("ctrl+v").consumed).toBe(false);
    expect(hiddenEditor.pasteClipboard).not.toHaveBeenCalled();
    expect(hiddenEditor.activateKeybindings).not.toHaveBeenCalled();
    const normal = new SessionViewportController({ enabled: true, editor: editor(), requestRender() {} });
    frame(normal, 30);
    normal.handlePreInput("\u001b[<64;2;2M");
    frame(normal, 30);
    const gesture = "\u001b[<0;1;2M\u001b[<32;2;2M\u001b[<0;2;2m";
    normal.handlePreInput(gesture);
    input(gesture);
    expect(input("\u0003")).toEqual(normal.handlePreInput("\u0003"));
    normal.clearPointerState();
    expect(input("\u0003").consumed).toBe(false);
    expect(received).toHaveLength(1);
    target.clearPointerState();
  });

  it.each([
    ["forward", "\u001b[<0;2;2M\u001b[<32;3;2M\u001b[<0;3;2m"],
    ["reverse", "\u001b[<0;3;2M\u001b[<32;2;2M\u001b[<0;2;2m"],
    ["multiline", "\u001b[<0;2;2M\u001b[<32;12;4M\u001b[<0;12;4m"],
    ["word", "\u001b[<0;3;2M\u001b[<0;3;2m\u001b[<0;3;2M\u001b[<0;3;2m"],
    ["line", "\u001b[<0;3;2M\u001b[<0;3;2m\u001b[<0;3;2M\u001b[<0;3;2m\u001b[<0;3;2M\u001b[<0;3;2m"],
  ])("keeps normal %s selection cells, source colors, copy, and render cadence with a modal", (_kind, gesture) => {
    const normal = hoverFixture();
    const modal = hoverFixture();
    try {
      const theme = { ...normal.input.theme, selection: (line: string, from: number, to: number) => backgroundSgrSpan(line, from, to) };
      const input = { ...normal.input, width: 192, height: 54, theme,
        documentRows: Array.from({ length: 120 }, () => "\u001b[38;2;255;120;20malpha 界 é beta\u001b[0m") };
      modal.target.setInputSurfaceFrame({ component: { render: () => [], invalidate() {} }, columnStart: 1, columnEnd: 192, rowStart: 54, rowEnd: 54 });
      normal.target.compose(input);
      modal.target.compose(input);
      normal.renders.length = 0;
      modal.renders.length = 0;
      normal.target.handlePreInput(gesture!, true, 1000);
      modal.target.handlePreInput(gesture!, true, 1000, false);
      expect(modal.renders).toEqual(normal.renders);
      expect(modal.target.compose(input).rows).toEqual(normal.target.compose(input).rows);
      const copy = normal.target.handlePreInput("\u0003");
      expect(copy.consumed).toBe(true);
      expect(modal.target.handlePreInput("\u0003", true, 1001, false)).toEqual(copy);
    } finally { normal.target.clearPointerState(); modal.target.clearPointerState(); }
  });

  it("latches both gesture directions and drains a gesture across a nested transition", () => {
    const { target, compose } = hoverFixture();
    const received: string[] = [];
    const component = { render: () => ["modal"], invalidate() {}, handleInput: (data: string) => received.push(data) };
    const region = { component, rowStart: 4, rowEnd: 5, columnStart: 10, columnEnd: 30 };
    target.setOverlaySurfaces([region]);
    compose();
    target.handlePreInput("\u001b[<0;11;4M\u001b[<32;1;2M\u001b[<0;1;2m", true, 0, false);
    expect(received).toEqual(["\u001b[<0;11;4M", "\u001b[<32;1;2M", "\u001b[<0;1;2m"]);
    expect(target.hasSelection).toBe(false);
    received.length = 0;
    target.handlePreInput("\u001b[<0;1;2M\u001b[<32;11;4M\u001b[<0;11;4m", true, 1, false);
    expect(received).toEqual([]);
    expect(target.hasSelection).toBe(true);
    target.handlePreInput("\u001b[<0;1;2M", true, 1000, false);
    target.setOverlaySurfaces([{ ...region, rowStart: 2 }]);
    compose();
    target.handlePreInput("\u001b[<32;11;4M\u001b[<0;11;4m", true, 1001, false);
    expect(received).toEqual([]);
    expect(target.hasSelection).toBe(false);
    target.handlePreInput("\u001b[<0;11;4M\u001b[<0;11;4m", true, 1002, false);
    expect(received).toHaveLength(2);
    target.clearPointerState();
  });

  it.each(["normal", "fast", "high"] as const)("preserves %s wheel and edge auto-scroll behind a modal", speed => {
    vi.useFakeTimers();
    const { target, compose } = hoverFixture();
    const normal = hoverFixture();
    try {
      normal.target.setConfig({ scrollbarAppearance: "always", scrollbarStyle: "thick", scrollbarSpeed: speed });
      normal.compose();
      target.setConfig({ scrollbarAppearance: "always", scrollbarStyle: "thick", scrollbarSpeed: speed });
      const modal = { component: { render: () => [], invalidate() {} }, columnStart: 1, columnEnd: 40, rowStart: 8, rowEnd: 8 };
      target.setInputSurfaceFrame(modal);
      compose();
      const distance = { normal: 3, fast: 6, high: 9 }[speed];
      const start = target.frame!.scrollTop;
      target.handlePreInput("\u001b[<64;2;2M", true, 0, false);
      compose();
      expect(target.frame!.scrollTop).toBe(start - distance);
      normal.target.handlePreInput("\u001b[<64;2;2M", true, 0);
      normal.compose();
      target.handlePreInput("\u001b[<0;1;2M\u001b[<32;2;8M", true, 1, false);
      normal.target.handlePreInput("\u001b[<0;1;2M\u001b[<32;2;8M", true, 1);
      vi.advanceTimersByTime(30);
      compose();
      normal.compose();
      expect(target.frame!.scrollTop).toBe(normal.target.frame!.scrollTop);
      const afterTick = target.frame!.scrollTop;
      target.setOverlaySurfaces(null);
      vi.advanceTimersByTime(90);
      compose();
      expect(target.frame!.scrollTop).toBe(afterTick);
      expect(target.hasSelection).toBe(false);
    } finally { target.clearPointerState(); normal.target.clearPointerState(); vi.useRealTimers(); }
  });

  it.each(["auto", "always", "hidden"] as const)("keeps %s scrollbar policy and navigation controls behind a modal", appearance => {
    const { target, compose } = hoverFixture();
    try {
      target.setConfig({ scrollbarAppearance: appearance, scrollbarStyle: "thin", scrollbarSpeed: "normal" });
      target.setInputSurfaceFrame({ component: { render: () => [], invalidate() {} }, columnStart: 1, columnEnd: 40, rowStart: 8, rowEnd: 8 });
      compose();
      target.handlePreInput("\u001b[<64;2;2M", true, Date.now(), false);
      let result = compose();
      expect(result.hits.rail === null).toBe(appearance === "hidden");
      if (result.hits.rail !== null) {
        const rail = result.hits.rail;
        const thumbRow = rail.rowStart + rail.geometry.thumbTop;
        target.handlePreInput(`\u001b[<0;${rail.column};${thumbRow}M\u001b[<32;${rail.column};1M\u001b[<0;${rail.column};1m`, true, Date.now(), false);
        result = compose();
        expect(result.scrollTop).toBe(0);
      }
      const bottom = result.hits.bottom!;
      target.handlePreInput(`\u001b[<0;${bottom.columnStart};${bottom.row}M\u001b[<0;${bottom.columnStart};${bottom.row}m`, true, Date.now(), false);
      expect(compose().followingEnd).toBe(true);
    } finally { target.clearPointerState(); }
  });

  it("suppresses no-frame selection through content arrival while preserving keyboard bytes", () => {
    const target = new SessionViewportController({ enabled: true, editor: editor(), requestRender() {} });
    try {
      expect(target.handlePreInput("x\u001b[<0;4;2M")).toEqual({ data: "x", consumed: true });
      frame(target);
      expect(target.handlePreInput("\u001b[<32;15;3M\u001b[<35;15;3M\u001b[<0;15;3my")).toEqual({ data: "y", consumed: true });
      expect(target.handlePreInput("\u0003").consumed).toBe(false);
      target.handlePreInput("\u001b[<0;1;2M");
      target.handlePreInput("\u001b[<32;4;2M");
      target.handlePreInput("\u001b[<0;4;2m");
      expect(target.handlePreInput("\u0003").copyText).toBeTruthy();
      target.reset();
      frame(target, 0);
      expect(target.handlePreInput("\u001b[<0;4;2M\u001b[<32;15;3M\u001b[<0;15;3m").consumed).toBe(true);
      expect(target.handlePreInput("\u0003").consumed).toBe(false);
    } finally { target.clearPointerState(); }
  });

  it.each([
    ["motion", "35", "M", false], ["press", "1", "M", false],
    ["release", "0", "m", false], ["wheel-up", "64", "M", true], ["wheel-down", "65", "M", true],
  ])("tracks %s coordinates while hidden without changing report ownership", (_kind, button, suffix, consumed) => {
    const { target, compose } = hoverFixture();
    try {
      const inside = `\u001b[<${button};20;7${suffix}`;
      expect(target.handlePreInput(inside).consumed).toBe(consumed);
      target.handlePreInput("ctrl+home");
      expect(compose().rows[6]).toContain("\u001b[46m");
      target.handlePreInput("ctrl+end");
      expect(compose().hits.bottom).toBeNull();
      target.handlePreInput(`\u001b[<${button};1;7${suffix}`);
      target.handlePreInput("ctrl+home");
      expect(compose().rows[6]).toContain("\u001b[45m");
    } finally {
      target.clearPointerState();
    }
  });

  it.each(["reset", "clearPointerState"] as const)("clears bottom hover through %s and preserves unknown-position styling", lifecycle => {
    const { target, compose } = hoverFixture();
    try {
      target.handlePreInput("ctrl+home");
      expect(compose().rows[6]).toContain("\u001b[45m");
      target.handlePreInput("\u001b[<35;20;7M");
      expect(compose().rows[6]).toContain("\u001b[46m");
      target[lifecycle]();
      compose();
      target.handlePreInput("ctrl+home");
      expect(compose().rows[6]).toContain("\u001b[45m");
    } finally {
      target.clearPointerState();
    }
  });

  it("invalidates presentation on unclaimed hover transitions without forced or follow-up renders", () => {
    const { target, compose, renders } = hoverFixture();
    try {
      target.handlePreInput("ctrl+home");
      compose();
      for (const [column, hovered] of [[20, true], [1, false]] as const) {
        renders.length = 0;
        const before = target.presentationRevision;
        const data = `\u001b[<1;${column};7M`;
        expect(target.handlePreInput(data, false)).toEqual({ data, consumed: false });
        expect(target.presentationRevision).toBe(before + 1);
        expect(renders).toEqual([false]);
        expect(compose().rows[6]).toContain(`\u001b[${hovered ? 46 : 45}m`);
        expect(renders).toEqual([false]);
        target.handlePreInput(data, false);
        expect(renders).toEqual([false]);
      }
    } finally {
      target.clearPointerState();
    }
  });

  it("owns a whole drag begun on transient tail chrome without creating a selection", () => {
    const { target, input, compose } = hoverFixture();
    try {
      const tailed = {
        ...input,
        documentRows: [...input.documentRows, " Steering: later", "", " Working..."],
        selectableDocumentRowCount: 30,
        bottomAlignedTailRowCount: 1,
      };
      const followed = target.compose(tailed);
      expect(followed.hits.transientTail).toEqual([5, 6, 7]);
      expect(target.handlePreInput("\u001b[<0;5;5M").consumed).toBe(true);
      expect(target.handlePreInput("\u001b[<32;5;3M").consumed).toBe(true);
      expect(target.handlePreInput("\u001b[<0;5;3m").consumed).toBe(true);
      const selected = target.compose(tailed);
      expect(target.hasSelection).toBe(false);
      expect(selected.rows[4]).toContain("Steering: later");
      expect(selected.rows[6]).toContain("Working...");
      expect(selected.rows[6]).not.toContain("\u001b[48;2;38;79;120m");
    } finally {
      target.clearPointerState();
    }
  });

  it("keeps wheel scrolling over the transient tail while suppressing selection", () => {
    const { target, input, compose } = hoverFixture();
    try {
      const tailed = { ...input, documentRows: [...input.documentRows, "", " Working..."], selectableDocumentRowCount: 30 };
      const followed = target.compose(tailed);
      expect(followed.hits.transientTail).toEqual([6, 7]);
      const before = followed.scrollTop;
      expect(target.handlePreInput("\u001b[<64;5;6M").consumed).toBe(true);
      expect(target.compose(tailed).scrollTop).toBeLessThan(before);
      expect(target.compose(tailed).hits.transientTail).toEqual([]);
      target.handlePreInput("\u001b[<65;5;1M");
      const again = target.compose(tailed);
      expect(again.hits.transientTail).toEqual([6, 7]);
      target.handlePreInput("\u001b[<0;5;7M");
      target.handlePreInput("\u001b[<32;5;4M");
      target.handlePreInput("\u001b[<0;5;4m");
      expect(target.hasSelection).toBe(false);
    } finally {
      target.clearPointerState();
    }
  });

  it("clamps selection and copy at the semantic end of a transient tail", () => {
    const { target, input, compose } = hoverFixture();
    try {
      const tailed = {
        ...input,
        documentRows: [...input.documentRows, " Steering: later", "", " Working..."],
        selectableDocumentRowCount: 30,
        bottomAlignedTailRowCount: 1,
      };
      compose();
      target.handlePreInput("\u001b[<0;4;2M");
      target.handlePreInput("\u001b[<32;4;7M");
      target.handlePreInput("\u001b[<0;4;7m");
      const copied = target.handlePreInput("\u0003");
      expect(copied.consumed).toBe(true);
      expect(copied.copyText).not.toContain("Steering");
      expect(copied.copyText).not.toContain("Working");
      expect(copied.copyText).toContain("row-25");
    } finally {
      target.clearPointerState();
    }
  });

  it("keeps jump-to-bottom controls ahead of transient-tail suppression", () => {
    const { target, input, compose } = hoverFixture();
    try {
      const tailed = { ...input, documentRows: [...input.documentRows, "", "", " Working..."], selectableDocumentRowCount: 30 };
      target.handlePreInput("\u001b[<64;30;2M");
      const detached = target.compose(tailed);
      const hit = detached.hits.bottom!;
      expect(detached.hits.transientTail).toEqual([]);
      expect(hit.row).toBe(7);
      target.handlePreInput(`\u001b[<0;${hit.columnStart};${hit.row}M`);
      target.handlePreInput(`\u001b[<0;${hit.columnStart};${hit.row}m`);
      const followed = target.compose(tailed);
      expect(followed.followingEnd).toBe(true);
      expect(followed.hits.transientTail).toEqual([5, 6, 7]);
      expect(followed.rows[6]).toContain("Working...");
      expect(target.hasSelection).toBe(false);
    } finally {
      target.clearPointerState();
    }
  });

  it.each([0, 1, 3])("hovers and activates the arrow as part of the bottom block with %i new messages", count => {
    const { target, compose } = hoverFixture();
    try {
      target.handlePreInput("ctrl+home");
      for (let index = 0; index < count; index += 1) target.noteCompletedAssistantMessage();
      const initial = compose();
      const hit = initial.hits.bottom!;
      const arrowColumn = stripAnsi(initial.rows[hit.row - 1]!).indexOf("↓") + 1;
      expect(arrowColumn).toBeGreaterThan(hit.columnStart);
      expect(arrowColumn).toBeLessThanOrEqual(hit.columnEnd);
      target.handlePreInput(`\u001b[<35;${hit.columnEnd + 1};${hit.row}M`);
      expect(compose().rows[hit.row - 1]).toContain("\u001b[45m");
      target.handlePreInput(`\u001b[<0;${hit.columnEnd + 1};${hit.row}M`);
      target.handlePreInput(`\u001b[<0;${hit.columnEnd + 1};${hit.row}m`);
      expect(compose().followingEnd).toBe(false);
      target.handlePreInput(`\u001b[<35;${arrowColumn};${hit.row}M`);
      expect(compose().rows[hit.row - 1]).toContain("\u001b[46m");
      target.handlePreInput(`\u001b[<0;${arrowColumn};${hit.row}M`);
      const followed = compose();
      expect(followed.followingEnd).toBe(true);
      expect(followed.hits.bottom).toBeNull();
    } finally { target.clearPointerState(); }
  });

  it("uses moved control geometry for hover and clicks, not the previous hit region", () => {
    const { target, input, compose } = hoverFixture();
    try {
      target.handlePreInput("ctrl+home");
      compose();
      target.handlePreInput("\u001b[<35;20;7M");
      expect(compose().rows[6]).toContain("\u001b[46m");
      const moved = target.compose({ ...input, dockRows: ["extra", "dock"] });
      expect(moved.hits.bottom!.row).toBe(6);
      expect(moved.rows[5]).toContain("\u001b[45m");
      target.handlePreInput("\u001b[<0;20;7M");
      target.handlePreInput("\u001b[<0;20;7m");
      expect(target.compose({ ...input, dockRows: ["extra", "dock"] }).followingEnd).toBe(false);
      target.handlePreInput("\u001b[<0;20;6M");
      expect(target.compose({ ...input, dockRows: ["extra", "dock"] }).hits.bottom).toBeNull();
    } finally {
      target.clearPointerState();
    }
  });

  it("does not claim input when the custom viewport is disabled", () => {
    const target = new SessionViewportController({ enabled: false, editor: editor(), requestRender() {} });
    expect(target.handlePreInput("ctrl+home")).toEqual({ data: "ctrl+home", consumed: false });
  });

  it.each(["ctrl+home", "ctrl+end"])("consumes %s before the first frame and at fitting or repeated boundaries", data => {
    const target = new SessionViewportController({ enabled: true, editor: editor(), requestRender() {} });
    try {
      expect(target.handlePreInput(data)).toEqual({ data: "", consumed: true });
      for (const length of [0, 3, 20]) {
        frame(target, length);
        for (let press = 0; press < 2; press += 1) {
          expect(target.handlePreInput(data)).toEqual({ data: "", consumed: true });
          frame(target, length);
          const current = target.frame!;
          expect(current.scrollTop).toBe(data === "ctrl+home" ? 0 : current.maxScroll);
          expect(current.followingEnd).toBe(data === "ctrl+end" || current.maxScroll === 0);
        }
      }
    } finally { target.clearPointerState(); }
  });

  it.each(["home", "end", "shift+home", "alt+end", "ctrl+shift+home", "ctrl+alt+end"])("leaves %s to the editor without viewport movement", data => {
    const target = new SessionViewportController({ enabled: true, editor: editor(), requestRender() {} });
    try {
      frame(target);
      target.handlePreInput("ctrl+home");
      frame(target);
      const before = target.frame!;
      expect(target.handlePreInput(data)).toEqual({ data, consumed: false });
      frame(target);
      expect(target.frame!.scrollTop).toBe(before.scrollTop);
      expect(target.frame!.followingEnd).toBe(before.followingEnd);
    } finally { target.clearPointerState(); }
  });

  it.each(["ctrl+home", "ctrl+end"])("respects disabled navigation for %s before and after composition", data => {
    const target = new SessionViewportController({ enabled: true, editor: editor(), requestRender() {} });
    try {
      expect(target.handlePreInput(data, false)).toEqual({ data, consumed: false });
      frame(target);
      const before = target.frame!;
      expect(target.handlePreInput(data, false)).toEqual({ data, consumed: false });
      frame(target);
      expect(target.frame!.scrollTop).toBe(before.scrollTop);
      expect(target.frame!.followingEnd).toBe(before.followingEnd);
    } finally { target.clearPointerState(); }
  });

  it("advances an explicit presentation revision for viewport-invalidating interaction", () => {
    const target = new SessionViewportController({ enabled: true, editor: editor(), requestRender() {} });
    frame(target);
    const initial = target.presentationRevision;
    target.handlePreInput("\u001b[<64;1;2M", true, 1_000);
    expect(target.presentationRevision).toBeGreaterThan(initial);
    const afterWheel = target.presentationRevision;
    target.setConfig({ scrollbarAppearance: "always", scrollbarStyle: "thin", scrollbarSpeed: "normal" });
    expect(target.presentationRevision).toBe(afterWheel + 1);
    target.reset();
    expect(target.presentationRevision).toBe(afterWheel + 2);
    target.clearPointerState();
    expect(target.presentationRevision).toBe(afterWheel + 3);
  });

  it("owns follow state and routes wheel and boundary keys without shell state", () => {
    const renders: (boolean | undefined)[] = [];
    const target = new SessionViewportController({
      enabled: true,
      editor: editor(),
      requestRender: force => renders.push(force),
    });
    expect(frame(target)[0]).toBe("row-15");

    const wheel = target.handlePreInput("\u001b[<64;1;2M", true, 1_000);
    expect(wheel.consumed).toBe(true);
    expect(frame(target)[0]).toBe("row-12");
    expect(renders).toContain(true);

    expect(target.handlePreInput("ctrl+home", true, 1_001)).toEqual({ data: "", consumed: true });
    expect(frame(target)[0]).toBe("row-0");
    expect(target.handlePreInput("ctrl+end", true, 1_002)).toEqual({ data: "", consumed: true });
    expect(frame(target)[0]).toBe("row-15");
  });

  it.each(["\u001b[1;2B"])("routes supported Shift+Down input %j from the last prompt to the bottom", data => {
    const renders: (boolean | undefined)[] = [];
    let draft = "keep this draft";
    const target = new SessionViewportController({
      enabled: true,
      editor: editor({ getText: () => draft, setText: text => { draft = text; } }),
      requestRender: force => renders.push(force),
    });
    const input = {
      documentRows: Array.from({ length: 30 }, (_, index) => `row-${index}`),
      dockRows: [], width: 20, height: 5,
      promptAnchors: [
        { id: "one", firstRow: 1, lastRow: 1, sourceRow: "❯ one" },
        { id: "two", firstRow: 20, lastRow: 20, sourceRow: "❯ two" },
      ],
    };
    try {
      target.compose(input);
      target.handlePreInput("\u001b[1;2A");
      expect(target.compose(input).scrollTop).toBe(20);
      renders.length = 0;
      expect(target.handlePreInput(data)).toEqual({ data: "", consumed: true });
      expect(renders).toEqual([undefined]);
      const bottom = target.compose(input);
      expect(bottom.scrollTop).toBe(bottom.maxScroll);
      expect(bottom.followingEnd).toBe(true);
      expect(draft).toBe("keep this draft");
      renders.length = 0;
      expect(target.handlePreInput(data)).toEqual({ data: "", consumed: true });
      expect(renders).toEqual([]);
    } finally {
      target.clearPointerState();
    }
  });

  it.each([
    { enabled: true, allowNavigation: false },
    { enabled: false, allowNavigation: true },
  ])("preserves Shift+Down ownership with %j", ({ enabled, allowNavigation }) => {
    const target = new SessionViewportController({ enabled, editor: editor(), requestRender() {} });
    const input = {
      documentRows: Array.from({ length: 30 }, (_, index) => `row-${index}`),
      dockRows: [], width: 20, height: 5,
      promptAnchors: [{ id: "one", firstRow: 1, lastRow: 1, sourceRow: "❯ one" }],
    };
    try {
      target.compose(input);
      if (enabled) target.handlePreInput("ctrl+home");
      const before = target.compose(input);
      const data = "\u001b[1;2B";
      expect(target.handlePreInput(data, allowNavigation)).toEqual({ data, consumed: false });
      const after = target.compose(input);
      expect(after.scrollTop).toBe(before.scrollTop);
      expect(after.followingEnd).toBe(before.followingEnd);
    } finally {
      target.clearPointerState();
    }
  });

  it("requests targeted cleanup and one non-forced repaint when native hyperlink hover leaves or moves", () => {
    const renders: (boolean | undefined)[] = [];
    const cleanups = vi.fn();
    const target = new SessionViewportController({
      enabled: true,
      editor: editor(),
      requestRender: force => renders.push(force),
      requestHyperlinkCleanup: cleanups,
    });
    const url = "https://example.com/full";
    const linked = `\u001b]8;;${url}\u001b\\link\u001b]8;;\u001b\\`;
    const compose = (rows: readonly string[]) => target.compose({
      documentRows: rows,
      dockRows: [],
      promptAnchors: [],
      width: 20,
      height: 2,
    });

    compose([linked, "plain"]);
    target.handlePreInput("\u001b[<35;2;1M");
    expect(cleanups).not.toHaveBeenCalled();
    renders.length = 0;
    target.handlePreInput("\u001b[<35;2;2M");
    expect(cleanups.mock.calls).toEqual([[[1]]]);
    expect(renders.map(Boolean)).toEqual([false]);

    target.handlePreInput("\u001b[<35;2;1M");
    renders.length = 0;
    cleanups.mockClear();
    compose(["plain", linked]);
    expect(cleanups.mock.calls).toEqual([[[1]]]);
    expect(renders.map(Boolean)).toEqual([false]);
    compose(["plain", linked]);
    expect(cleanups).toHaveBeenCalledTimes(1);
    expect(renders).toHaveLength(1);
    target.clearPointerState();
  });

  it("requests cleanup when the same hovered target changes its column bounds", () => {
    const renders: (boolean | undefined)[] = [];
    const cleanups = vi.fn();
    const target = new SessionViewportController({
      enabled: true,
      editor: editor(),
      requestRender: force => renders.push(force),
      requestHyperlinkCleanup: cleanups,
    });
    const link = (label: string) => `\u001b]8;;https://example.test/full\u001b\\${label}\u001b]8;;\u001b\\`;
    const compose = (row: string) => target.compose({
      documentRows: [row, "plain"], dockRows: [], promptAnchors: [], width: 40, height: 2,
    });
    compose(link("long link"));
    target.handlePreInput("\u001b[<35;3;1M");
    renders.length = 0;

    // Invariant: column 3 still hits the same URL on row 1, but the old
    // underline's cells outside [2, 6) now need explicit cleanup.
    compose(`  ${link("link")}`);
    expect(cleanups.mock.calls).toEqual([[[1]]]);
    expect(renders.map(Boolean)).toEqual([false]);
    target.clearPointerState();
  });

  it.each([
    "https://example.test/long-path",
    "\u001b]8;;https://example.test\u0007long label\u001b]8;;\u0007",
  ])("keeps motion inside one occurrence cheap and latches cleanup on leave: %s", linked => {
    const renders: (boolean | undefined)[] = [];
    const cleanups = vi.fn();
    const target = new SessionViewportController({
      enabled: true, editor: editor(), requestRender: force => renders.push(force),
      requestHyperlinkCleanup: cleanups,
    });
    target.compose({ documentRows: [linked, "plain"], dockRows: [], promptAnchors: [], width: 80, height: 2 });
    target.handlePreInput("\u001b[<35;2;1M");
    target.handlePreInput("\u001b[<35;3;1M");
    expect(cleanups).not.toHaveBeenCalled();
    expect(renders).not.toContain(true);
    renders.length = 0;
    target.compose({ documentRows: [linked.replaceAll("example.test", "changed.test"), "plain"], dockRows: [], promptAnchors: [], width: 80, height: 2 });
    expect(cleanups.mock.calls).toEqual([[[1]]]);
    expect(renders.map(Boolean)).toEqual([false]);
    renders.length = 0;
    target.handlePreInput("\u001b[<35;3;2M");
    expect(cleanups.mock.calls).toEqual([[[1]], [[1]]]);
    expect(renders.map(Boolean)).toEqual([false]);
    target.handlePreInput("\u001b[<35;4;2M");
    expect(cleanups).toHaveBeenCalledTimes(2);
    expect(renders).not.toContain(true);
    target.clearPointerState();
  });

  it("cleans up native hyperlink hover when a non-motion report relocates the pointer", () => {
    const { target, input, renders, cleanups } = hoverFixture();
    try {
      const linked = "\u001b]8;;https://example.com\u001b\\link\u001b]8;;\u001b\\";
      const plain = { ...input, documentRows: ["plain", linked, "plain"] };
      target.compose(plain);
      target.handlePreInput("\u001b[<35;2;2M");
      expect(cleanups).not.toHaveBeenCalled();
      renders.length = 0;
      const data = "\u001b[<1;2;3M";
      expect(target.handlePreInput(data)).toEqual({ data, consumed: false });
      expect(cleanups.mock.calls).toEqual([[[2]]]);
      expect(renders.map(Boolean)).toEqual([false]);
      target.compose(plain);
      expect(cleanups).toHaveBeenCalledTimes(1);
      expect(renders.map(Boolean)).toEqual([false]);
    } finally {
      target.clearPointerState();
    }
  });

  it("routes editor pointer input only through the declared editor frame", () => {
    const events: PiShellEditorPointerEvent[] = [];
    let ownsPointer = false;
    const target = new SessionViewportController({
      enabled: true,
      editor: editor({
        ownsPointer: () => ownsPointer,
        handlePointer: event => {
          events.push(event);
          if (event.kind === "press") ownsPointer = true;
          if (event.kind === "release") ownsPointer = false;
          return true;
        },
      }),
      requestRender() {},
    });
    target.setEditorPointerFrame({ rowStart: 4, rowEnd: 5 });
    frame(target);

    expect(target.handlePreInput("\u001b[<0;3;4M").consumed).toBe(true);
    expect(target.handlePreInput("\u001b[<32;4;5M").consumed).toBe(true);
    expect(target.handlePreInput("\u001b[<0;4;5m").consumed).toBe(true);
    expect(events.map(event => [event.kind, event.row])).toEqual([
      ["press", 1],
      ["motion", 2],
      ["release", 2],
    ]);
  });

  it("leaves Ctrl+C to the focused surface after an unextended transcript click", () => {
    const target = new SessionViewportController({ enabled: true, editor: editor(), requestRender() {} });
    frame(target, 1);
    expect(target.handlePreInput("\u001b[<0;2;1M").consumed).toBe(true);
    expect(target.handlePreInput("\u001b[<0;2;1m").consumed).toBe(true);
    expect(target.handlePreInput("\u0003")).toEqual({ data: "\u0003", consumed: false });
  });

  it("coalesces a pointer-report burst to the latest selection endpoint", () => {
    const renders: (boolean | undefined)[] = [];
    const target = new SessionViewportController({
      enabled: true,
      editor: editor(),
      requestRender: force => renders.push(force),
    });
    frame(target, 1);
    renders.length = 0;

    const burst = target.handlePreInput("\u001b[<0;1;1M\u001b[<32;2;1M\u001b[<35;5;1M");
    expect(burst.consumed).toBe(true);
    expect(renders).toEqual([false]);
    const latest = target.compose({
      documentRows: ["row-0"], dockRows: [], promptAnchors: [], width: 20, height: 1,
    });
    expect(latest.descriptor.selectionRevision).toBe(target.selectionRevision);

    target.handlePreInput("\u001b[<0;5;1m");
    const copied = target.handlePreInput("\u0003");
    expect(copied).toMatchObject({ consumed: true, copyText: "row-0" });
  });

  it("keeps the anchor selected through no-button reversal and clears only after copying", () => {
    const target = new SessionViewportController({ enabled: true, editor: editor(), requestRender() {} });
    const theme = {
      track: (text: string) => text,
      thumb: (text: string) => text,
      sticky: (text: string) => text,
      quietSticky: (text: string) => text,
      bottomControl: (text: string) => text,
      selection: (line: string, from: number, to: number) => backgroundSgrSpan(line, from, to),
    };
    const input = { documentRows: ["abcde"], dockRows: [], promptAnchors: [], width: 10, height: 1, theme };
    target.compose(input);
    target.handlePreInput("\u001b[<0;3;1M", true, 1_000);
    for (const [column, from, to] of [[2, 1, 3], [3, 2, 3], [4, 2, 4], [3, 2, 3]] as const) {
      expect(target.handlePreInput(`\u001b[<35;${column};1M`, true, 1_001).consumed).toBe(true);
      const selected = target.compose(input);
      expect(target.hasSelection).toBe(true);
      expect(selected.rows[0]).toBe(backgroundSgrSpan("abcde     ", from, to));
    }
    target.handlePreInput("\u001b[<0;3;1m", true, 1_002);
    expect(target.hasSelection).toBe(true);
    expect(target.handlePreInput("\u0003")).toMatchObject({ consumed: true, copyText: "c" });
    expect(target.hasSelection).toBe(false);
    expect(target.handlePreInput("\u0003")).toEqual({ data: "\u0003", consumed: false });
    target.clearPointerState();
  });

  it("requests one latest-state follow-up when selection changes during composition", () => {
    const renders: (boolean | undefined)[] = [];
    const target = new SessionViewportController({
      enabled: true,
      editor: editor(),
      requestRender: force => renders.push(force),
    });
    const input = { documentRows: ["abcdef"], dockRows: [] as string[], promptAnchors: [], width: 10, height: 1 };
    target.compose(input);
    target.handlePreInput("\u001b[<0;1;1M");
    target.handlePreInput("\u001b[<32;3;1M");
    renders.length = 0;
    let injected = false;
    const theme = {
      track: (text: string) => text,
      thumb: (text: string) => text,
      sticky: (text: string) => text,
      quietSticky: (text: string) => text,
      bottomControl: (text: string) => text,
      selection: (line: string, from: number, to: number) => {
        if (!injected) {
          injected = true;
          target.handlePreInput("\u001b[<35;5;1M");
        }
        return backgroundSgrSpan(line, from, to);
      },
    };

    const stale = target.compose({ ...input, theme });
    expect(stale.descriptor.selectionRevision).toBeLessThan(target.selectionRevision);
    expect(renders).toEqual([false]);
    const latest = target.compose({ ...input, theme });
    expect(latest.descriptor.selectionRevision).toBe(target.selectionRevision);
    expect(stripAnsi(latest.rows[0] ?? "").trimEnd()).toBe("abcdef");
  });

  it("clears pointer geometry and transient interaction on reset", () => {
    const events: PiShellEditorPointerEvent[] = [];
    const target = new SessionViewportController({
      enabled: true,
      editor: editor({ handlePointer: event => { events.push(event); return true; } }),
      requestRender() {},
    });
    target.setEditorPointerFrame({ rowStart: 4, rowEnd: 5 });
    frame(target);
    target.reset();
    frame(target);

    target.handlePreInput("\u001b[<0;3;4M");
    expect(events).toEqual([]);
  });
});

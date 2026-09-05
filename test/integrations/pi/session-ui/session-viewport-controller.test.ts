import { describe, expect, it } from "vitest";
import { backgroundSgrSpan, stripAnsi } from "../../../../src/ui/components/index.js";
import type { PiShellEditorPointerEvent, PiShellEditorPort } from "../../../../src/integrations/pi/components/index.js";
import { SessionViewportController } from "../../../../src/integrations/pi/session-ui/session-viewport-controller.js";

function editor(overrides: Partial<PiShellEditorPort> = {}): PiShellEditorPort {
  return {
    render: () => [],
    invalidate() {},
    activateKeybindings() {},
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
  const target = new SessionViewportController({ enabled: true, editor: editor(), requestRender: force => renders.push(force) });
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
  return { target, input, compose, renders };
}

describe("session viewport interaction controller", () => {
  it.each([
    ["motion", "35", "M", false], ["press", "1", "M", false],
    ["release", "0", "m", false], ["wheel-up", "64", "M", true], ["wheel-down", "65", "M", true],
  ])("tracks %s coordinates while hidden without changing report ownership", (_kind, button, suffix, consumed) => {
    const { target, compose } = hoverFixture();
    try {
      const inside = `\u001b[<${button};20;7${suffix}`;
      expect(target.handlePreInput(inside).consumed).toBe(consumed);
      target.handlePreInput("home");
      expect(compose().rows[6]).toContain("\u001b[46m");
      target.handlePreInput("end");
      expect(compose().hits.bottom).toBeNull();
      target.handlePreInput(`\u001b[<${button};1;7${suffix}`);
      target.handlePreInput("home");
      expect(compose().rows[6]).toContain("\u001b[45m");
    } finally {
      target.clearPointerState();
    }
  });

  it.each(["reset", "clearPointerState"] as const)("clears bottom hover through %s and preserves unknown-position styling", lifecycle => {
    const { target, compose } = hoverFixture();
    try {
      target.handlePreInput("home");
      expect(compose().rows[6]).toContain("\u001b[45m");
      target.handlePreInput("\u001b[<35;20;7M");
      expect(compose().rows[6]).toContain("\u001b[46m");
      target[lifecycle]();
      compose();
      target.handlePreInput("home");
      expect(compose().rows[6]).toContain("\u001b[45m");
    } finally {
      target.clearPointerState();
    }
  });

  it("invalidates presentation on unclaimed hover transitions without forced or follow-up renders", () => {
    const { target, compose, renders } = hoverFixture();
    try {
      target.handlePreInput("home");
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
      const tailed = { ...input, documentRows: [...input.documentRows, "", " Working..."], selectableDocumentRowCount: 30 };
      const followed = target.compose(tailed);
      expect(followed.hits.transientTail).toEqual([6, 7]);
      expect(target.handlePreInput("\u001b[<0;5;6M").consumed).toBe(true);
      expect(target.handlePreInput("\u001b[<32;5;3M").consumed).toBe(true);
      expect(target.handlePreInput("\u001b[<0;5;3m").consumed).toBe(true);
      const selected = target.compose(tailed);
      expect(target.hasSelection).toBe(false);
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
      const tailed = { ...input, documentRows: [...input.documentRows, "", " Working..."], selectableDocumentRowCount: 30 };
      compose();
      target.handlePreInput("\u001b[<0;4;2M");
      target.handlePreInput("\u001b[<32;4;7M");
      target.handlePreInput("\u001b[<0;4;7m");
      const copied = target.handlePreInput("\u0003");
      expect(copied.consumed).toBe(true);
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

  it("uses moved control geometry for hover and clicks, not the previous hit region", () => {
    const { target, input, compose } = hoverFixture();
    try {
      target.handlePreInput("home");
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
    expect(target.handlePreInput("home")).toEqual({ data: "home", consumed: false });
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

    expect(target.handlePreInput("home", true, 1_001)).toEqual({ data: "", consumed: true });
    expect(frame(target)[0]).toBe("row-0");
    expect(target.handlePreInput("end", true, 1_002)).toEqual({ data: "", consumed: true });
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
      if (enabled) target.handlePreInput("home");
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

  it("forces one repaint when native hyperlink hover leaves or moves under a stationary pointer", () => {
    const renders: (boolean | undefined)[] = [];
    const target = new SessionViewportController({
      enabled: true,
      editor: editor(),
      requestRender: force => renders.push(force),
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
    renders.length = 0;
    target.handlePreInput("\u001b[<35;2;2M");
    expect(renders).toContain(true);

    target.handlePreInput("\u001b[<35;2;1M");
    renders.length = 0;
    compose(["plain", linked]);
    expect(renders).toContain(true);
  });

  it("requests cleanup when the same hovered target changes its column bounds", () => {
    const renders: (boolean | undefined)[] = [];
    const target = new SessionViewportController({
      enabled: true,
      editor: editor(),
      requestRender: force => renders.push(force),
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
    expect(renders).toContain(true);
    target.clearPointerState();
  });

  it.each([
    "https://example.test/long-path",
    "\u001b]8;;https://example.test\u0007long label\u001b]8;;\u0007",
  ])("keeps motion inside one occurrence cheap and latches cleanup on leave: %s", linked => {
    const renders: (boolean | undefined)[] = [];
    let cleanups = 0;
    const target = new SessionViewportController({
      enabled: true, editor: editor(), requestRender: force => renders.push(force),
      requestHyperlinkCleanup: () => { cleanups += 1; },
    });
    target.compose({ documentRows: [linked, "plain"], dockRows: [], promptAnchors: [], width: 80, height: 2 });
    target.handlePreInput("\u001b[<35;2;1M");
    target.handlePreInput("\u001b[<35;3;1M");
    expect(cleanups).toBe(0);
    expect(renders).not.toContain(true);
    target.compose({ documentRows: [linked.replaceAll("example.test", "changed.test"), "plain"], dockRows: [], promptAnchors: [], width: 80, height: 2 });
    expect(cleanups).toBe(1);
    target.handlePreInput("\u001b[<35;3;2M");
    expect(cleanups).toBe(2);
    expect(renders).toContain(true);
    target.handlePreInput("\u001b[<35;4;2M");
    expect(cleanups).toBe(2);
    target.clearPointerState();
  });

  it("cleans up native hyperlink hover when a non-motion report relocates the pointer", () => {
    const { target, input, renders } = hoverFixture();
    try {
      const linked = "\u001b]8;;https://example.com\u001b\\link\u001b]8;;\u001b\\";
      const plain = { ...input, documentRows: [linked, "plain"] };
      target.compose(plain);
      target.handlePreInput("\u001b[<35;2;1M");
      renders.length = 0;
      const data = "\u001b[<1;2;2M";
      expect(target.handlePreInput(data)).toEqual({ data, consumed: false });
      expect(renders).toEqual([true]);
      target.compose(plain);
      expect(renders).toEqual([true]);
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

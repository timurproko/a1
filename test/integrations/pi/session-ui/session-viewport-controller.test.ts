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

describe("session viewport interaction controller", () => {
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

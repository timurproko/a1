import { describe, expect, it } from "vitest";
import { stripAnsi } from "../../../../src/ui/components/index.js";
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

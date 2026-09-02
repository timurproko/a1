import { StdinBuffer } from "@earendil-works/pi-tui";
import { describe, expect, it } from "vitest";
import {
  PiTuiRuntimeAdapter,
  PiTuiRuntimeError,
  classifyPiTuiInput,
  type PiTuiComponentPort,
  type PiTuiTerminalPort,
} from "../../../../src/integrations/pi/tui-runtime/index.js";

class TestComponent implements PiTuiComponentPort {
  readonly inputs: string[] = [];
  readonly focus: boolean[] = [];
  invalidations = 0;
  renders = 0;
  disposed = false;

  constructor(public lines: readonly string[], readonly reflectInputs = false) {}

  render(): readonly string[] {
    this.renders += 1;
    return this.reflectInputs ? [...this.lines, this.inputs.join("")] : this.lines;
  }

  handleInput(data: string): void {
    this.inputs.push(data);
  }

  invalidate(): void {
    this.invalidations += 1;
  }

  setFocused(focused: boolean): void {
    this.focus.push(focused);
  }

  dispose(): void {
    this.disposed = true;
  }
}

class TestTerminal implements PiTuiTerminalPort {
  columns = 30;
  rows = 6;
  kittyProtocolActive = false;
  readonly writes: string[] = [];
  starts = 0;
  stops = 0;
  drains = 0;
  failStart = false;
  failStop = false;
  failDrain = false;
  failProgress = false;
  #input: ((data: string) => void) | undefined;
  #resize: (() => void) | undefined;

  start(onInput: (data: string) => void, onResize: () => void): void {
    this.starts += 1;
    if (this.failStart) throw new Error("start failed");
    this.#input = onInput;
    this.#resize = onResize;
  }

  stop(): void {
    this.stops += 1;
    this.#input = undefined;
    this.#resize = undefined;
    if (this.failStop) throw new Error("stop failed");
  }

  async drainInput(): Promise<void> {
    this.drains += 1;
    if (this.failDrain) throw new Error("drain failed");
  }

  write(data: string): void {
    this.writes.push(data);
  }

  input(data: string): void {
    this.#input?.(data);
  }

  resize(columns: number, rows: number): void {
    this.columns = columns;
    this.rows = rows;
    this.#resize?.();
  }

  moveBy(lines: number): void {
    this.write(`move:${lines}`);
  }

  hideCursor(): void {
    this.write("\x1b[?25l");
  }

  showCursor(): void {
    this.write("\x1b[?25h");
  }

  clearLine(): void {
    this.write("\x1b[K");
  }

  clearFromCursor(): void {
    this.write("\x1b[J");
  }

  clearScreen(): void {
    this.write("\x1b[2J\x1b[H");
  }

  setTitle(title: string): void {
    this.write(`title:${title}`);
  }

  setProgress(active: boolean): void {
    if (this.failProgress) throw new Error("progress failed");
    this.write(`progress:${active}`);
  }
}

describe("PiTuiRuntimeAdapter", () => {
  it("owns public fullscreen lifecycle, focus, input, overlays, differential rendering, resize, and restoration", async () => {
    const terminal = new TestTerminal();
    const root = new TestComponent(["unchanged", "before"]);
    const overlay = new TestComponent(["dialog"]);
    const runtime = new PiTuiRuntimeAdapter({ root, terminal, mode: "fullscreen", mouse: false });

    expect(runtime.state).toBe("idle");
    expect(runtime.mode).toBe("fullscreen");
    runtime.start();
    runtime.renderNow(true);
    expect(runtime.state).toBe("running");
    expect(terminal.starts).toBe(1);
    expect(root.focus.at(-1)).toBe(true);
    expect(terminal.writes.join("")).toContain("\x1b[?1049h");
    runtime.setHardwareCursor(true);
    runtime.setClearOnShrink(false);
    runtime.setTerminalProgress(true);
    expect(runtime.getHardwareCursor()).toBe(true);
    expect(runtime.getClearOnShrink()).toBe(false);
    expect(terminal.writes).toContain("progress:true");

    terminal.input("root");
    runtime.renderNow();
    expect(root.inputs).toEqual(["root"]);

    root.lines = ["unchanged", "after"];
    runtime.renderNow();
    expect(terminal.writes.at(-1)).toContain("after");
    expect(terminal.writes.at(-1)).not.toContain("unchanged");

    const handle = runtime.showOverlay(overlay, { width: 12, anchor: "center" });
    runtime.renderNow();
    terminal.input("overlay");
    runtime.renderNow();
    expect(handle.isFocused()).toBe(true);
    expect(overlay.inputs).toEqual(["overlay"]);
    expect(root.inputs).toEqual(["root"]);
    handle.unfocus({ target: root });
    expect(root.focus.at(-1)).toBe(true);
    handle.focus();
    handle.hide();
    expect(overlay.disposed).toBe(true);
    expect(runtime.hasOverlay()).toBe(false);

    const redraws = runtime.fullRedraws;
    terminal.resize(50, 10);
    runtime.renderNow();
    expect(runtime.viewport()).toEqual({ columns: 50, rows: 10 });
    expect(runtime.fullRedraws).toBeGreaterThan(redraws);

    await runtime.stop({ drainMaxMs: 1, drainIdleMs: 1 });
    expect(runtime.state).toBe("stopped");
    expect(terminal.drains).toBe(1);
    expect(terminal.stops).toBe(1);
    expect(root.disposed).toBe(true);
    expect(terminal.writes.join("")).toContain("\x1b[?1049l");
    expect(terminal.writes.at(-1)).toBe("progress:false");
  });

  it("reports progress control failure and still performs unconditional cleanup", async () => {
    const terminal = new TestTerminal();
    const runtime = new PiTuiRuntimeAdapter({ root: new TestComponent(["root"]), terminal });
    runtime.start();
    terminal.failProgress = true;
    expect(() => runtime.setTerminalProgress(true)).toThrow("progress failed");
    await expect(runtime.stop()).resolves.toBeUndefined();
    expect(runtime.state).toBe("stopped");
  });

  it("routes and transforms physical input before the TUI in registration order", async () => {
    const terminal = new TestTerminal();
    const root = new TestComponent(["root"]);
    const runtime = new PiTuiRuntimeAdapter({ root, terminal });
    const order: string[] = [];
    const removeFirst = runtime.addPreInputListener(data => {
      order.push(`first:${data}`);
      return { data: data.replace("mouse", "") };
    });
    runtime.addPreInputListener(data => {
      order.push(`second:${data}`);
      return data === "drop" ? { consume: true } : undefined;
    });
    runtime.start();

    terminal.input("mousekey");
    expect(order).toEqual(["first:mousekey", "second:key"]);
    expect(root.inputs).toEqual(["key"]);
    terminal.input("mousedrop");
    expect(root.inputs).toEqual(["key"]);

    removeFirst();
    terminal.input("plain");
    expect(root.inputs).toEqual(["key", "plain"]);
    await runtime.stop();
  });

  it("coordinates safe custom-viewport input into one current-state immediate render with phase evidence", async () => {
    const terminal = new TestTerminal();
    const root = new TestComponent(["root"], true);
    const phases: Array<{ phase: string; revision: number; pendingDepth: number }> = [];
    const runtime = new PiTuiRuntimeAdapter({
      root,
      terminal,
      mode: "fullscreen",
      inputCoordination: { classify: (data, overlay) => classifyPiTuiInput(data, overlay ?? "editor") },
      inputDiagnostics: { onEvent: event => phases.push(event) },
    });
    runtime.start();
    runtime.renderNow();
    const baselineRenders = root.renders;
    phases.length = 0;

    terminal.input("a");
    terminal.input("b");
    expect(root.inputs).toEqual([]);
    await new Promise<void>(resolve => setImmediate(resolve));

    expect(root.inputs).toEqual(["a", "b"]);
    expect(root.renders).toBe(baselineRenders + 1);
    expect(phases.filter(event => event.phase === "receipt").map(event => event.revision)).toEqual([1, 2]);
    expect(phases.filter(event => event.phase === "semantic-end").map(event => event.revision)).toEqual([1, 2]);
    expect(phases.filter(event => event.phase === "composition-end").at(-1)).toMatchObject({ revision: 2, pendingDepth: 0 });
    expect(phases.filter(event => event.phase === "write-end").at(-1)?.revision).toBe(2);
    await runtime.stop({ drainInput: false, preserveScreen: true });
  });

  it("flushes safe input before barriers and resize without changing synchronous comparison input", async () => {
    const coordinatedTerminal = new TestTerminal();
    const coordinatedRoot = new TestComponent(["root"]);
    const coordinated = new PiTuiRuntimeAdapter({
      root: coordinatedRoot,
      terminal: coordinatedTerminal,
      inputCoordination: { classify: (data, overlay) => classifyPiTuiInput(data, overlay ?? "editor") },
    });
    coordinated.start();
    coordinatedTerminal.input("before");
    coordinatedTerminal.input("\r");
    expect(coordinatedRoot.inputs).toEqual(["before", "\r"]);
    coordinatedTerminal.input("resize-first");
    coordinatedTerminal.resize(40, 8);
    expect(coordinatedRoot.inputs.at(-1)).toBe("resize-first");

    const ownedOverlay = new TestComponent(["owned"]);
    const ownedHandle = coordinated.showOverlay(ownedOverlay, { inputCoordination: "owned" });
    coordinatedTerminal.input("a");
    coordinatedTerminal.input("b");
    expect(ownedOverlay.inputs).toEqual([]);
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(ownedOverlay.inputs).toEqual(["a", "b"]);
    ownedHandle.hide();

    const opaqueOverlay = new TestComponent(["opaque"]);
    coordinated.showOverlay(opaqueOverlay);
    coordinatedTerminal.input("extension-data");
    expect(opaqueOverlay.inputs).toEqual(["extension-data"]);
    await coordinated.stop({ drainInput: false, preserveScreen: true });

    const comparisonTerminal = new TestTerminal();
    const comparisonRoot = new TestComponent(["root"]);
    const comparison = new PiTuiRuntimeAdapter({ root: comparisonRoot, terminal: comparisonTerminal });
    comparison.start();
    comparisonTerminal.input("immediate");
    expect(comparisonRoot.inputs).toEqual(["immediate"]);
    await comparison.stop({ drainInput: false, preserveScreen: true });
  });

  it("rejects over-width component rows instead of silently rewriting source layout", async () => {
    const terminal = new TestTerminal();
    terminal.columns = 5;
    const root = new TestComponent(["123456"]);
    const runtime = new PiTuiRuntimeAdapter({ root, terminal });
    runtime.start();
    expect(() => runtime.renderNow()).toThrow("component row 0 exceeds available width 5");
    await runtime.stop();
  });

  it("supports adapter-owned input interception without exposing Pi listener types", async () => {
    const terminal = new TestTerminal();
    const root = new TestComponent(["root"]);
    const runtime = new PiTuiRuntimeAdapter({ root, terminal });
    runtime.start();
    runtime.renderNow();

    const removeTransform = runtime.addInputListener(data => ({ data: data.toUpperCase() }));
    terminal.input("changed");
    runtime.renderNow();
    expect(root.inputs).toEqual(["CHANGED"]);
    removeTransform();

    const removeConsume = runtime.addInputListener(() => ({ consume: true }));
    terminal.input("blocked");
    runtime.renderNow();
    expect(root.inputs).toEqual(["CHANGED"]);
    removeConsume();
    const mountedOverlay = new TestComponent(["mounted"]);
    runtime.showOverlay(mountedOverlay);
    await runtime.stop({ drainInput: false, preserveScreen: true });
    expect(mountedOverlay.disposed).toBe(true);
  });

  it("uses the public regular main-screen renderer by default and leaves selection to the terminal", async () => {
    const terminal = new TestTerminal();
    const root = new TestComponent(["[38;2;255;0;0mcolored text[0m", "plain text"]);
    const runtime = new PiTuiRuntimeAdapter({ root, terminal });

    runtime.start();
    runtime.renderNow(true);
    expect(runtime.mode).toBe("regular");
    const frame = terminal.writes.join("");
    expect(frame).not.toContain("[?1049h");
    expect(frame).not.toContain("[?1000h");
    expect(frame).not.toContain("[?1006h");
    expect(frame).toContain("[38;2;255;0;0mcolored text");

    terminal.input("/");
    runtime.renderNow();
    expect(root.inputs).toEqual(["/"]);
    expect(terminal.writes.join("")).not.toContain("Copied!");
    expect(terminal.writes.join("")).not.toContain("]52;");

    await runtime.stop({ drainInput: false, preserveScreen: true });
    expect(terminal.writes.join("")).not.toContain("[?1049l");
  });

  it("switches between public regular and fullscreen renderers without selection patching", async () => {
    const terminal = new TestTerminal();
    const root = new TestComponent(["root"]);
    const runtime = new PiTuiRuntimeAdapter({ root, terminal });
    runtime.start();
    runtime.renderNow(true);

    expect(runtime.switchMode("fullscreen")).toBe(true);
    runtime.renderNow(true);
    expect(runtime.mode).toBe("fullscreen");
    expect(terminal.writes.join("")).toContain("\x1b[?1049h");

    expect(runtime.switchMode("regular")).toBe(true);
    runtime.renderNow(true);
    expect(runtime.mode).toBe("regular");
    expect(terminal.writes.join("")).toContain("\x1b[?1049l");
    await runtime.stop({ drainInput: false, preserveScreen: true });
  });

  it("preserves the pinned one-row fullscreen wheel default", async () => {
    const terminal = new TestTerminal();
    terminal.rows = 5;
    const root = new TestComponent(Array.from({ length: 12 }, (_, index) => `row-${index}`));
    const runtime = new PiTuiRuntimeAdapter({ root, terminal, mode: "fullscreen" });
    runtime.start();
    runtime.renderNow(true);
    runtime.scrollToTop();
    terminal.input("\x1b[<65;5;3M");
    runtime.renderNow();
    expect(runtime.scrollState().scrollTop).toBe(1);
    await runtime.stop({ drainInput: false, preserveScreen: true });
  });

  it("matches pinned physical-wheel batching, configured distance, direct scrolling, and boundaries", async () => {
    const terminal = new TestTerminal();
    terminal.rows = 5;
    const root = new TestComponent(Array.from({ length: 12 }, (_, index) => `row-${index}`));
    const runtime = new PiTuiRuntimeAdapter({ root, terminal, mode: "fullscreen", wheelScrollLines: 2 });
    runtime.start();
    runtime.renderNow(true);
    runtime.scrollToTop();
    runtime.renderNow();
    expect(runtime.scrollState().scrollTop).toBe(0);

    const stdin = new StdinBuffer({ timeout: 1 });
    stdin.on("data", sequence => terminal.input(sequence));
    stdin.process("\x1b[<65;5;3M\x1b[<65;5;3M");
    runtime.renderNow();
    expect(runtime.scrollState().scrollTop).toBe(4);
    expect(root.inputs).toEqual([]);

    runtime.scrollBy(-2);
    runtime.renderNow();
    expect(runtime.scrollState().scrollTop).toBe(2);
    runtime.scrollToBottom();
    runtime.renderNow();
    const bottom = runtime.scrollState().scrollTop;
    terminal.input("\x1b[<65;5;3M");
    runtime.renderNow();
    expect(runtime.scrollState().scrollTop).toBe(bottom);
    runtime.scrollToTop();
    terminal.input("\x1b[<64;5;3M");
    runtime.renderNow();
    expect(runtime.scrollState().scrollTop).toBe(0);

    stdin.destroy();
    await runtime.stop({ drainInput: false, preserveScreen: true });
  });

  it.each(["contain", "chain"] as const)("routes nested wheel overscroll with pinned %s semantics and primary fallback", async overscroll => {
    const terminal = new TestTerminal();
    terminal.rows = 8;
    const primary = new TestComponent(Array.from({ length: 16 }, (_, index) => `primary-${index}`));
    const nested = new TestComponent(Array.from({ length: 10 }, (_, index) => `nested-${index}`));
    const runtime = new PiTuiRuntimeAdapter({
      root: primary,
      terminal,
      mode: "fullscreen",
      wheelScrollLines: 2,
      layoutRoot: {
        type: "stack",
        direction: "vertical",
        children: [
          {
            basis: 3,
            node: {
              type: "scroll",
              id: "nested",
              overscroll,
              scrollbar: "always",
              child: { type: "component", component: nested },
            },
          },
          {
            basis: 0,
            grow: 1,
            minSize: 1,
            node: {
              type: "scroll",
              id: "primary",
              primary: true,
              scrollbar: "always",
              child: { type: "component", component: primary },
            },
          },
        ],
      },
    });
    runtime.start();
    runtime.renderNow(true);
    terminal.input("\x1b[<65;5;2M");
    runtime.renderNow();
    expect(runtime.scrollState("nested")).toMatchObject({ scrollTop: 2, viewportHeight: 3, scrollbarVisible: true });
    expect(runtime.scrollState("primary").scrollTop).toBe(0);

    runtime.scrollToBottom("nested");
    runtime.renderNow();
    terminal.input("\x1b[<65;5;2M");
    runtime.renderNow();
    expect(runtime.scrollState("primary").scrollTop).toBe(2);

    terminal.resize(24, 10);
    runtime.renderNow();
    expect(runtime.scrollState("nested").viewportHeight).toBe(3);
    expect(terminal.writes.join("")).toContain("\x1b[100m");
    await runtime.stop({ drainInput: false, preserveScreen: true });
    expect(primary.disposed).toBe(true);
    expect(nested.disposed).toBe(true);
  });

  it("contains startup and restoration failures and still attempts terminal cleanup", async () => {
    const failedStartTerminal = new TestTerminal();
    failedStartTerminal.failStart = true;
    const failedStartRoot = new TestComponent(["root"]);
    const failedStart = new PiTuiRuntimeAdapter({ root: failedStartRoot, terminal: failedStartTerminal });
    expect(() => failedStart.start()).toThrow(PiTuiRuntimeError);
    expect(failedStart.state).toBe("failed");
    expect(failedStartRoot.disposed).toBe(true);
    expect(failedStartTerminal.stops).toBeGreaterThan(0);

    const failedStopTerminal = new TestTerminal();
    const failedStopRoot = new TestComponent(["root"]);
    const failedStop = new PiTuiRuntimeAdapter({ root: failedStopRoot, terminal: failedStopTerminal });
    failedStop.start();
    failedStop.renderNow();
    failedStopTerminal.failStop = true;
    await expect(failedStop.stop({ drainInput: false })).rejects.toMatchObject({ stage: "restoration" });
    expect(failedStop.state).toBe("failed");
    expect(failedStopRoot.disposed).toBe(true);
    expect(failedStopTerminal.stops).toBeGreaterThanOrEqual(2);
  });
});

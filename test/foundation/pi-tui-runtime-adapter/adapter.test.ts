import { StdinBuffer } from "@earendil-works/pi-tui";
import { describe, expect, it } from "vitest";
import {
  PiTuiRuntimeAdapter,
  PiTuiRuntimeError,
  type PiTuiComponentPort,
  type PiTuiTerminalPort,
} from "../../../src/foundation/pi-tui-runtime-adapter/index.js";

class TestComponent implements PiTuiComponentPort {
  readonly inputs: string[] = [];
  readonly focus: boolean[] = [];
  invalidations = 0;
  disposed = false;

  constructor(public lines: readonly string[]) {}

  render(): readonly string[] {
    return this.lines;
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
    this.write(`progress:${active}`);
  }
}

describe("PiTuiRuntimeAdapter", () => {
  it("owns public fullscreen lifecycle, focus, input, overlays, differential rendering, resize, and restoration", async () => {
    const terminal = new TestTerminal();
    const root = new TestComponent(["unchanged", "before"]);
    const overlay = new TestComponent(["dialog"]);
    const runtime = new PiTuiRuntimeAdapter({ root, terminal, mouse: false });

    expect(runtime.state).toBe("idle");
    expect(runtime.mode).toBe("fullscreen");
    runtime.start();
    runtime.renderNow(true);
    expect(runtime.state).toBe("running");
    expect(terminal.starts).toBe(1);
    expect(root.focus.at(-1)).toBe(true);
    expect(terminal.writes.join("")).toContain("\x1b[?1049h");

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

  it("matches pinned physical-wheel batching, configured distance, direct scrolling, and boundaries", async () => {
    const terminal = new TestTerminal();
    terminal.rows = 5;
    const root = new TestComponent(Array.from({ length: 12 }, (_, index) => `row-${index}`));
    const runtime = new PiTuiRuntimeAdapter({ root, terminal, wheelScrollLines: 2 });
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

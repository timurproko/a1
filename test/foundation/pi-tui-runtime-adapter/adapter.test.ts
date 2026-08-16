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

type EmulatedCell = { readonly character: string; readonly foreground: number | null; readonly background: number | null };

function emulateTerminalCells(writes: readonly string[], columns: number, rows: number): EmulatedCell[][] {
  const cells = Array.from({ length: rows }, () => Array<EmulatedCell>(columns));
  let row = 0;
  let column = 0;
  let foreground: number | null = null;
  let background: number | null = null;
  let inverse = false;
  const data = writes.join("");
  for (let index = 0; index < data.length;) {
    if (data.startsWith("\x1b]", index)) {
      const bell = data.indexOf("\x07", index + 2);
      index = bell < 0 ? data.length : bell + 1;
      continue;
    }
    if (data.startsWith("\x1b[", index)) {
      const match = /^\x1b\[([0-9;?]*)([A-Za-z@`~])/.exec(data.slice(index));
      if (match === null) { index += 1; continue; }
      const values = match[1]!.replace(/^\?/, "").split(";").filter(Boolean).map(Number);
      const value = values[0] ?? 1;
      if (match[2] === "H" || match[2] === "f") {
        row = Math.max(0, (values[0] ?? 1) - 1);
        column = Math.max(0, (values[1] ?? 1) - 1);
      } else if (match[2] === "G") column = Math.max(0, value - 1);
      else if (match[2] === "A") row = Math.max(0, row - value);
      else if (match[2] === "B") row = Math.min(rows - 1, row + value);
      else if (match[2] === "C") column = Math.min(columns - 1, column + value);
      else if (match[2] === "D") column = Math.max(0, column - value);
      else if (match[2] === "J" && value === 2) for (const line of cells) line.length = 0;
      else if (match[2] === "K") cells[row] = Array<EmulatedCell>(columns);
      else if (match[2] === "m") {
        const sgr = values.length === 0 ? [0] : values;
        for (let cursor = 0; cursor < sgr.length; cursor += 1) {
          const code = sgr[cursor]!;
          if (code === 0) { foreground = null; background = null; inverse = false; }
          else if ((code >= 30 && code <= 37) || (code >= 90 && code <= 97)) foreground = code;
          else if ((code >= 40 && code <= 47) || (code >= 100 && code <= 107)) background = code;
          else if (code === 39) foreground = null;
          else if (code === 49) background = null;
          else if (code === 7) inverse = true;
          else if (code === 27) inverse = false;
          else if ((code === 38 || code === 48) && sgr[cursor + 1] === 2) cursor += 4;
          else if ((code === 38 || code === 48) && sgr[cursor + 1] === 5) cursor += 2;
        }
      }
      index += match[0].length;
      continue;
    }
    const character = data[index]!;
    index += 1;
    if (character === "\n") { row = Math.min(rows - 1, row + 1); column = 0; continue; }
    if (character === "\r") { column = 0; continue; }
    if (character < " ") continue;
    if (row < rows && column < columns) {
      cells[row]![column] = {
        character,
        foreground: inverse ? background : foreground,
        background: inverse ? foreground : background,
      };
    }
    column += 1;
  }
  return cells;
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

  it("retains a uniform selection, copies only on selected Ctrl+C, and never renders a copy flash", async () => {
    const terminal = new TestTerminal();
    terminal.rows = 5;
    const root = new TestComponent(["\x1b[38;2;255;0;0mcolored text\x1b[0m", "plain text"]);
    const runtime = new PiTuiRuntimeAdapter({ root, terminal });
    runtime.start();
    runtime.renderNow(true);
    terminal.writes.length = 0;

    terminal.input("\x1b[<0;1;1M");
    terminal.input("\x1b[<32;8;1M");
    terminal.input("\x1b[<0;8;1m");
    runtime.renderNow();

    const selectionFrame = terminal.writes.join("");
    expect(selectionFrame).not.toContain("Copied!");
    expect(selectionFrame).not.toContain("\x1b]52;");
    const inverse = /\x1b\[30;107m([\s\S]*?)\x1b\[0m/.exec(selectionFrame)?.[1] ?? "";
    expect(inverse).toContain("colored");
    expect(inverse).not.toMatch(/\x1b\[(?:38|48);/);
    expect(selectionFrame).toContain("\x1b[30;107m");

    terminal.writes.length = 0;
    terminal.input("\x03");
    expect(terminal.writes.join("")).toContain("\x1b]52;");
    expect(root.inputs).not.toContain("\x03");

    terminal.input("\x1b[<0;2;2M");
    terminal.input("\x1b[<0;2;2m");
    terminal.input("\x03");
    runtime.renderNow();
    expect(root.inputs).toContain("\x03");
    await runtime.stop({ drainInput: false, preserveScreen: true });
  });

  it("renders character, word, line, and area selections with bright-white cells across styled content", async () => {
    const terminal = new TestTerminal();
    terminal.rows = 5;
    const root = new TestComponent([
      "\x1b[38;2;255;0;0mred\x1b[0m plain λ界",
      "\x1b[1msecond styled row\x1b[22m",
    ]);
    const runtime = new PiTuiRuntimeAdapter({ root, terminal });
    runtime.start();
    runtime.renderNow(true);

    const assertUniform = (events: readonly string[]) => {
      terminal.writes.length = 0;
      for (const event of events) terminal.input(event);
      runtime.renderNow(true);
      const frame = terminal.writes.join("");
      const spans = [...frame.matchAll(/\x1b\[30;107m([\s\S]*?)\x1b\[0m/g)];
      expect(spans.length).toBeGreaterThan(0);
      expect(spans.every(match => !/\x1b\[(?:3[0-9]|4[0-9]|9[0-7]|10[0-7])(?:;|m)/.test(match[1] ?? ""))).toBe(true);
    };

    assertUniform(["\x1b[<0;2;1M", "\x1b[<32;3;1M", "\x1b[<0;3;1m"]);
    assertUniform([
      "\x1b[<0;6;1M", "\x1b[<0;6;1m",
      "\x1b[<0;6;1M", "\x1b[<0;6;1m",
    ]);
    assertUniform([
      "\x1b[<0;4;2M", "\x1b[<0;4;2m",
      "\x1b[<0;4;2M", "\x1b[<0;4;2m",
      "\x1b[<0;4;2M", "\x1b[<0;4;2m",
    ]);
    assertUniform(["\x1b[<0;1;1M", "\x1b[<32;10;2M", "\x1b[<0;10;2m"]);
    await runtime.stop({ drainInput: false, preserveScreen: true });
  });

  it("clears retained selection before command input so new UI does not inherit old coordinates", async () => {
    const terminal = new TestTerminal();
    terminal.columns = 80;
    terminal.rows = 8;
    const root = new TestComponent([
      "\x1b[38;2;255;200;0m[Skills]\x1b[0m",
      "cavecrew, caveman, openspec-apply-change",
    ]);
    const runtime = new PiTuiRuntimeAdapter({ root, terminal });
    runtime.start();
    runtime.renderNow(true);
    terminal.writes.length = 0;

    terminal.input("\x1b[<0;1;1M");
    terminal.input("\x1b[<32;20;2M");
    terminal.input("\x1b[<0;20;2m");
    runtime.renderNow();
    const selected = terminal.writes.join("");
    expect(selected).toContain("\x1b[30;107m");
    expect(selected).not.toMatch(/\x1b\[30;107m[^\x1b]*\x1b\[38;2;255;200;0m/);
    const selectedCells = emulateTerminalCells(terminal.writes, terminal.columns, terminal.rows)
      .flat()
      .filter(cell => cell?.background === 107);
    expect(selectedCells.length).toBeGreaterThan(0);
    expect(selectedCells.every(cell => cell.foreground === 30 && cell.background === 107)).toBe(true);

    terminal.writes.length = 0;
    terminal.input("/");
    root.lines = ["/", "settings  Open settings menu", "model  Select model"];
    runtime.renderNow();
    expect(root.inputs).toEqual(["/"]);
    expect(terminal.writes.join("")).not.toContain("\x1b[30;107m");
    expect(emulateTerminalCells(terminal.writes, terminal.columns, terminal.rows).flat().some(cell => cell?.background === 107)).toBe(false);
    await runtime.stop({ drainInput: false, preserveScreen: true });
  });

  it("moves three rows for one physical wheel notch by default", async () => {
    const terminal = new TestTerminal();
    terminal.rows = 5;
    const root = new TestComponent(Array.from({ length: 12 }, (_, index) => `row-${index}`));
    const runtime = new PiTuiRuntimeAdapter({ root, terminal });
    runtime.start();
    runtime.renderNow(true);
    runtime.scrollToTop();
    terminal.input("\x1b[<65;5;3M");
    runtime.renderNow();
    expect(runtime.scrollState().scrollTop).toBe(3);
    await runtime.stop({ drainInput: false, preserveScreen: true });
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

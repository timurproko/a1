import { PassThrough } from "node:stream";
import { describe, expect, it } from "vitest";
import {
  createProcessTerminalHost,
  displayWidth,
  OwnedTerminalRuntime,
  sanitizeLines,
  truncateVisible,
  type OwnedTerminalComponent,
  type OwnedTerminalHost,
  type OwnedTerminalInput,
} from "../../../src/features/owned-ui/index.js";

class FakeHost implements OwnedTerminalHost {
  columns = 20;
  rows = 5;
  readonly writes: string[] = [];
  active = false;
  #input: ((text: string) => void) | undefined;
  #resize: ((columns: number, rows: number) => void) | undefined;

  write(text: string): void {
    this.writes.push(text);
  }

  setActive(active: boolean): void {
    this.active = active;
  }

  onInput(listener: (text: string) => void): () => void {
    this.#input = listener;
    return () => {
      if (this.#input === listener) this.#input = undefined;
    };
  }

  onResize(listener: (columns: number, rows: number) => void): () => void {
    this.#resize = listener;
    return () => {
      if (this.#resize === listener) this.#resize = undefined;
    };
  }

  input(text: string): void {
    this.#input?.(text);
  }

  resize(columns: number, rows: number): void {
    this.columns = columns;
    this.rows = rows;
    this.#resize?.(columns, rows);
  }
}

class TestComponent implements OwnedTerminalComponent {
  focused = false;
  invalidated = 0;
  disposed = false;
  readonly inputs: OwnedTerminalInput[] = [];

  constructor(
    readonly id: string,
    readonly lines: readonly string[],
    readonly consume = false,
  ) {}

  render(): readonly string[] {
    return this.lines;
  }

  handleInput(input: OwnedTerminalInput): boolean | void {
    this.inputs.push(input);
    return this.consume;
  }

  invalidate(): void {
    this.invalidated += 1;
  }

  dispose(): void {
    this.disposed = true;
  }
}

describe("owned terminal runtime", () => {
  it("starts an isolated fullscreen surface, coalesces renders, and restores the host", async () => {
    const host = new FakeHost();
    const root = new TestComponent("root", ["hello"]);
    const runtime = new OwnedTerminalRuntime({ host, root });

    runtime.start();
    const first = runtime.requestRender();
    const second = runtime.requestRender();
    await Promise.all([first, second]);

    expect(host.active).toBe(true);
    expect(root.focused).toBe(true);
    expect(host.writes[0]).toBe("\x1b[?1049h\x1b[?2004h\x1b[?25l");
    expect(host.writes[0]).not.toContain("?1000h");
    expect(host.writes.filter(write => write.includes("hello"))).toHaveLength(1);
    expect(host.writes.at(-1)).toContain("\x1b[H\x1b[0J");
    expect(host.writes.at(-1)).not.toContain("\x1b[?2026");

    await runtime.dispose();
    expect(host.active).toBe(false);
    expect(root.disposed).toBe(true);
    expect(host.writes.at(-1)).toBe("\x1b[?2004l\x1b[?25h\x1b[?1049l");
  });

  it("keeps synchronized output explicitly opt-in", async () => {
    const host = new FakeHost();
    const runtime = new OwnedTerminalRuntime({ host, root: new TestComponent("root", ["sync"]), synchronizedOutput: true });
    runtime.start();
    await runtime.requestRender();
    expect(host.writes.at(-1)).toContain("\x1b[?2026h");
    expect(host.writes.at(-1)).toContain("\x1b[?2026l");
    await runtime.dispose();
  });

  it("normalizes text, split keys, paste, and resize before routing to focus", async () => {
    const host = new FakeHost();
    const root = new TestComponent("root", ["root"]);
    const runtime = new OwnedTerminalRuntime({ host, root });
    runtime.start();
    await runtime.requestRender();

    host.input("a");
    host.input("\x01");
    host.input("\x1b[");
    host.input("A");
    host.input("\x1b[200~hello\nworld\x1b[201~");
    host.resize(40, 10);
    await runtime.requestRender();

    expect(root.inputs).toEqual([
      { type: "text", text: "a" },
      { type: "key", key: "a", ctrl: true, alt: false, shift: false },
      { type: "key", key: "up", ctrl: false, alt: false, shift: false },
      { type: "paste", text: "hello\nworld" },
      { type: "resize", columns: 40, rows: 10 },
    ]);
    expect(root.invalidated).toBe(1);
    await runtime.dispose();
  });

  it("routes modal overlays first and restores focus after overlay disposal", async () => {
    const host = new FakeHost();
    const root = new TestComponent("root", ["root"]);
    const overlay = new TestComponent("overlay", ["overlay"], true);
    const runtime = new OwnedTerminalRuntime({ host, root });
    runtime.start();
    await runtime.requestRender();

    runtime.showOverlay(overlay, true);
    await runtime.requestRender();
    host.input("x");
    await runtime.requestRender();

    expect(root.focused).toBe(false);
    expect(overlay.focused).toBe(true);
    expect(overlay.inputs).toEqual([{ type: "text", text: "x" }]);
    expect(root.inputs).toEqual([]);
    expect(host.writes.at(-1)).toContain("root");
    expect(host.writes.at(-1)).toContain("overlay");

    expect(runtime.hideOverlay("overlay")).toBe(true);
    await runtime.requestRender();
    expect(root.focused).toBe(true);
    expect(overlay.disposed).toBe(true);
    await runtime.dispose();
  });

  it("provides a process host facade without owning raw bytes in AddOne control state", () => {
    const input = new PassThrough() as unknown as NodeJS.ReadStream;
    const output = new PassThrough() as unknown as NodeJS.WriteStream;
    Object.assign(output, { columns: 88, rows: 33 });
    const host = createProcessTerminalHost(input, output);
    expect(host.columns).toBe(88);
    expect(host.rows).toBe(33);
    const received: string[] = [];
    const unsubscribe = host.onInput(text => received.push(text));
    input.emit("data", Buffer.from("x"));
    unsubscribe();
    expect(received).toEqual(["x"]);
  });

  it("keeps rendered lines within the active viewport width", () => {
    expect(displayWidth("ab界c")).toBe(5);
    expect(truncateVisible("ab界c", 4)).toBe("ab界");
    expect(sanitizeLines(["plain", "a".repeat(30)], 10)).toEqual(["plain", "aaaaaaaaaa"]);
  });
});

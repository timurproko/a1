import { ScrollView, StdinBuffer, TuiAltScreen, VStack, type Component } from "@earendil-works/pi-tui";
import { describe, expect, it } from "vitest";
import { PiTuiRuntimeAdapter } from "../../../../src/integrations/pi/tui-runtime/index.js";
import type { TerminalPort } from "../../../../src/contracts/presentation/index.js";

class WheelTerminal implements TerminalPort {
  columns = 32;
  rows = 8;
  readonly kittyProtocolActive = false;
  readonly writes: string[] = [];
  #input: ((data: string) => void) | undefined;
  #resize: (() => void) | undefined;
  start(input: (data: string) => void, resize: () => void): void { this.#input = input; this.#resize = resize; }
  stop(): void { this.#input = undefined; this.#resize = undefined; }
  async drainInput(): Promise<void> {}
  write(data: string): void { this.writes.push(data); }
  input(data: string): void { this.#input?.(data); }
  resize(columns: number, rows: number): void { this.columns = columns; this.rows = rows; this.#resize?.(); }
  moveBy(): void {}
  hideCursor(): void {}
  showCursor(): void {}
  clearLine(): void {}
  clearFromCursor(): void {}
  clearScreen(): void {}
  setTitle(): void {}
  setProgress(): void {}
  setProgramStatus(): void {}
}

class WheelComponent implements Component {
  readonly prefix: string;
  readonly count: number;
  constructor(prefix: string, count: number) { this.prefix = prefix; this.count = count; }
  render(): string[] { return Array.from({ length: this.count }, (_, index) => `${this.prefix}-${index}`); }
  invalidate(): void {}
}

describe("pinned TuiAltScreen wheel parity", () => {
  // Invariant: identical frames from the untouched producer and the adapter on identical input prove identical scrolling.
  it.each([undefined, 2] as const)("matches the untouched public producer for batched physical wheel input with wheel distance %s", async wheelScrollLines => {
    const options = wheelScrollLines === undefined ? undefined : { wheelScrollLines };
    const upstreamTerminal = new WheelTerminal();
    const upstream = new TuiAltScreen(upstreamTerminal, false, undefined, options);
    upstream.addChild(new WheelComponent("row", 16));
    upstream.start();
    upstream.renderNow(true);

    const adapterTerminal = new WheelTerminal();
    const adapter = new PiTuiRuntimeAdapter({ root: new WheelComponent("row", 16), terminal: adapterTerminal, mode: "fullscreen", ...options });
    adapter.start();
    adapter.renderNow(true);

    const step = wheelScrollLines ?? 1;
    const both = (sequence: string): void => {
      for (const terminal of [upstreamTerminal, adapterTerminal]) {
        const buffer = new StdinBuffer({ timeout: 1 });
        buffer.on("data", value => terminal.input(value));
        buffer.process(sequence);
        buffer.destroy();
      }
      upstream.renderNow();
      adapter.renderNow();
      expect(adapterTerminal.writes.at(-1)).toBe(upstreamTerminal.writes.at(-1));
    };
    const up = "\x1b[<64;6;4M";
    const down = "\x1b[<65;6;4M";

    both(up.repeat(16));
    expect(upstream.viewportTop).toBe(0);
    both(down + down);
    expect(upstream.viewportTop).toBe(2 * step);
    both(up);
    expect(upstream.viewportTop).toBe(step);
    both(down.repeat(16));
    const bottom = upstream.viewportTop;
    both(down);
    expect(upstream.viewportTop).toBe(bottom);

    upstream.stop({ preserveScreen: true });
    await adapter.stop({ drainInput: false, preserveScreen: true });
  });

  it.each(["contain", "chain"] as const)("matches nested %s routing, primary fallback, scrollbar, and resize", async overscroll => {
    const upstreamTerminal = new WheelTerminal();
    const upstreamNestedContent = new WheelComponent("nested", 10);
    const upstreamPrimaryContent = new WheelComponent("primary", 16);
    const upstreamNested = new ScrollView(upstreamNestedContent, { overscroll, scrollbar: "always" });
    const upstreamPrimary = new ScrollView(upstreamPrimaryContent, { primary: true, scrollbar: "always" });
    const upstreamLayout = new VStack([
      { component: upstreamNested, basis: 3 },
      { component: upstreamPrimary, basis: 0, grow: 1, minSize: 1 },
    ]);
    const upstream = new TuiAltScreen(upstreamTerminal, false, undefined, { wheelScrollLines: 2 });
    upstream.setLayoutRoot(upstreamLayout);
    upstream.start();
    upstream.renderNow(true);

    const adapterTerminal = new WheelTerminal();
    const adapterNested = new WheelComponent("nested", 10);
    const adapterPrimary = new WheelComponent("primary", 16);
    const adapter = new PiTuiRuntimeAdapter({
      root: adapterPrimary,
      terminal: adapterTerminal,
      mode: "fullscreen",
      wheelScrollLines: 2,
      layoutRoot: {
        type: "stack",
        direction: "vertical",
        children: [
          { basis: 3, node: { type: "scroll", id: "nested", overscroll, scrollbar: "always", child: { type: "component", component: adapterNested } } },
          { basis: 0, grow: 1, minSize: 1, node: { type: "scroll", id: "primary", primary: true, scrollbar: "always", child: { type: "component", component: adapterPrimary } } },
        ],
      },
    });
    adapter.start();
    adapter.renderNow(true);

    upstreamTerminal.input("\x1b[<65;6;2M");
    adapterTerminal.input("\x1b[<65;6;2M");
    upstream.renderNow();
    adapter.renderNow();
    expect(upstreamNested.scrollTop).toBe(2);
    expect(upstreamPrimary.scrollTop).toBe(0);
    expect(adapterTerminal.writes.at(-1)).toBe(upstreamTerminal.writes.at(-1));

    // Rationale: three more two-row steps reach the nested end (top 7 of 10 rows in a 3-row view) on both sides.
    for (let index = 0; index < 3; index += 1) {
      upstreamTerminal.input("\x1b[<65;6;2M");
      adapterTerminal.input("\x1b[<65;6;2M");
      upstream.renderNow();
      adapter.renderNow();
    }
    expect(upstreamNested.scrollTop).toBe(7);
    expect(adapterTerminal.writes.at(-1)).toBe(upstreamTerminal.writes.at(-1));
    const primaryBefore = upstreamPrimary.scrollTop;
    upstreamTerminal.input("\x1b[<65;6;2M");
    adapterTerminal.input("\x1b[<65;6;2M");
    upstream.renderNow();
    adapter.renderNow();
    expect(upstreamPrimary.scrollTop).toBeGreaterThan(primaryBefore);
    expect(adapterTerminal.writes.at(-1)).toBe(upstreamTerminal.writes.at(-1));

    upstreamTerminal.resize(24, 10);
    adapterTerminal.resize(24, 10);
    upstream.renderNow();
    adapter.renderNow();
    expect(adapterTerminal.writes.at(-1)).toBe(upstreamTerminal.writes.at(-1));

    upstream.stop({ preserveScreen: true });
    await adapter.stop({ drainInput: false, preserveScreen: true });
  });
});

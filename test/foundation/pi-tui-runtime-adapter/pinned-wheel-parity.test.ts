import { ScrollView, StdinBuffer, TuiAltScreen, VStack, type Component } from "@earendil-works/pi-tui";
import { describe, expect, it } from "vitest";
import { PiTuiRuntimeAdapter, type PiTuiTerminalPort } from "../../../src/foundation/pi-tui-runtime-adapter/index.js";

class WheelTerminal implements PiTuiTerminalPort {
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
}

class WheelComponent implements Component {
  constructor(readonly prefix: string, readonly count: number) {}
  render(): string[] { return Array.from({ length: this.count }, (_, index) => `${this.prefix}-${index}`); }
  invalidate(): void {}
}

describe("pinned TuiAltScreen wheel parity", () => {
  it("matches the untouched public producer for batched physical and direct scrolling", async () => {
    const upstreamTerminal = new WheelTerminal();
    const upstreamRoot = new WheelComponent("row", 16);
    const upstream = new TuiAltScreen(upstreamTerminal, false, undefined, { wheelScrollLines: 2 });
    upstream.addChild(upstreamRoot);
    upstream.start();
    upstream.renderNow(true);
    upstream.scrollToTop();
    upstream.renderNow();

    const adapterTerminal = new WheelTerminal();
    const adapterRoot = new WheelComponent("row", 16);
    const adapter = new PiTuiRuntimeAdapter({ root: adapterRoot, terminal: adapterTerminal, mode: "fullscreen", wheelScrollLines: 2 });
    adapter.start();
    adapter.renderNow(true);
    adapter.scrollToTop();
    adapter.renderNow();

    for (const [terminal, input] of [[upstreamTerminal, (value: string) => upstreamTerminal.input(value)], [adapterTerminal, (value: string) => adapterTerminal.input(value)]] as const) {
      const buffer = new StdinBuffer({ timeout: 1 });
      buffer.on("data", input);
      buffer.process("\x1b[<65;6;4M\x1b[<65;6;4M");
      buffer.destroy();
      expect(terminal.writes.length).toBeGreaterThan(0);
    }
    upstream.renderNow();
    adapter.renderNow();
    expect(adapter.scrollState().scrollTop).toBe(upstream.viewportTop);
    expect(adapterTerminal.writes.at(-1)).toBe(upstreamTerminal.writes.at(-1));

    upstream.scrollBy(-2);
    adapter.scrollBy(-2);
    upstream.renderNow();
    adapter.renderNow();
    expect(adapter.scrollState().scrollTop).toBe(upstream.viewportTop);
    expect(adapterTerminal.writes.at(-1)).toBe(upstreamTerminal.writes.at(-1));

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
    expect(adapter.scrollState("nested").scrollTop).toBe(upstreamNested.scrollTop);
    expect(adapter.scrollState("primary").scrollTop).toBe(upstreamPrimary.scrollTop);
    expect(adapter.scrollState("nested").scrollbarVisible).toBe(upstreamNested.isScrollbarVisible);

    upstreamNested.scrollToEnd();
    adapter.scrollToBottom("nested");
    upstream.renderNow();
    adapter.renderNow();
    upstreamTerminal.input("\x1b[<65;6;2M");
    adapterTerminal.input("\x1b[<65;6;2M");
    upstream.renderNow();
    adapter.renderNow();
    expect(adapter.scrollState("primary").scrollTop).toBe(upstreamPrimary.scrollTop);
    expect(adapterTerminal.writes.at(-1)).toBe(upstreamTerminal.writes.at(-1));

    upstreamTerminal.resize(24, 10);
    adapterTerminal.resize(24, 10);
    upstream.renderNow();
    adapter.renderNow();
    expect(adapter.scrollState("nested").viewportHeight).toBe(upstreamNested.viewportHeight);
    expect(adapterTerminal.writes.at(-1)).toBe(upstreamTerminal.writes.at(-1));

    upstream.stop({ preserveScreen: true });
    await adapter.stop({ drainInput: false, preserveScreen: true });
  });
});

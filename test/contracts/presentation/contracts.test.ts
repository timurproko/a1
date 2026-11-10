import { describe, expect, it } from "vitest";
import {
  assertPresentationComponent,
  assertPresentationRuntime,
  probePresentationLifecycle,
  wrapChoiceIndex,
  type PresentationComponentPort,
  type PresentationRuntimePort,
  type PresentationRuntimeState,
} from "../../../src/contracts/presentation/index.js";

class Runtime implements PresentationRuntimePort {
  state: PresentationRuntimeState = "idle";
  readonly terminal = {
    columns: 80, rows: 24, enhancedKeyboard: false,
    start() {}, stop() {}, async drainInput() {}, write() {}, moveBy() {}, clearLine() {}, clearFromCursor() {}, clearScreen() {}, setTitle() {}, setProgress() {}, showCursor() {}, hideCursor() {},
  };
  start(): void { this.state = "running"; }
  render(): void {}
  showOverlay() { return { visible: true, hide() {}, show() {}, focus() {}, dispose() {} }; }
  async stop(): Promise<void> { this.state = "stopped"; }
}

const component: PresentationComponentPort = {
  render: width => [`row:${width}`],
  invalidate() {},
  handleInput() {},
  setFocused() {},
  dispose() {},
};

describe("vendor-neutral presentation contracts", () => {
  it("wraps choices in both directions and keeps empty or singleton lists safe", () => {
    expect(wrapChoiceIndex(0, -1, 4)).toBe(3);
    expect(wrapChoiceIndex(3, 1, 4)).toBe(0);
    expect(wrapChoiceIndex(1, 1, 4)).toBe(2);
    for (const count of [0, 1]) for (const delta of [-1, 1]) expect(wrapChoiceIndex(0, delta, count)).toBe(0);
  });
  it("accepts a bounded component and complete terminal runtime", async () => {
    expect(() => assertPresentationComponent(component)).not.toThrow();
    const runtime = new Runtime();
    expect(() => assertPresentationRuntime(runtime)).not.toThrow();
    await expect(probePresentationLifecycle(runtime)).resolves.toBeUndefined();
  });

  it("rejects malformed component methods and render rows", () => {
    expect(() => assertPresentationComponent({ render: () => [] } as never)).toThrow(/requires invalidate/);
    expect(() => assertPresentationComponent({ ...component, render: () => ["two\nrows"] })).toThrow(/newline-free/);
    expect(() => assertPresentationComponent({ ...component, render: () => [1] as never })).toThrow(/string rows/);
  });

  it("rejects malformed terminal geometry and missing lifecycle methods", () => {
    const runtime = new Runtime();
    Object.assign(runtime.terminal, { columns: 0 });
    expect(() => assertPresentationRuntime(runtime)).toThrow(/geometry/);
    expect(() => assertPresentationRuntime({ state: "idle", terminal: new Runtime().terminal } as never)).toThrow(/requires start/);
  });

  it("detects lifecycle implementations that fail to transition or stop idempotently", async () => {
    const runtime = new Runtime();
    runtime.start = () => {};
    await expect(probePresentationLifecycle(runtime)).rejects.toThrow(/running state/);
    const wrongInitial = new Runtime();
    wrongInitial.state = "running";
    await expect(probePresentationLifecycle(wrongInitial)).rejects.toThrow(/begin idle/);
  });
});

import { describe, expect, it } from "vitest";
import {
  assertPresentationComponent,
  assertPresentationRuntime,
  probePresentationLifecycle,
  type PresentationComponentPort,
  type PresentationRuntimePort,
  type PresentationRuntimeState,
} from "../../../src/foundation/presentation-contracts/index.js";

class Runtime implements PresentationRuntimePort {
  state: PresentationRuntimeState = "idle";
  readonly terminal = {
    columns: 80, rows: 24, enhancedKeyboard: false,
    start() {}, stop() {}, write() {}, setTitle() {}, showCursor() {}, hideCursor() {},
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

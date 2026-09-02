import { describe, expect, it } from "vitest";
import {
  InputPresentationCoordinator,
  classifyPiTuiInput,
  type PiTuiInputCoordinationScheduler,
  type PiTuiInputCoordinationTrace,
} from "../../../../src/integrations/pi/tui-runtime/index.js";

class ImmediateScheduler implements PiTuiInputCoordinationScheduler {
  readonly callbacks = new Map<ReturnType<typeof setImmediate>, () => void>();
  scheduleImmediate(callback: () => void): ReturnType<typeof setImmediate> {
    const handle = {} as ReturnType<typeof setImmediate>;
    this.callbacks.set(handle, callback);
    return handle;
  }
  cancelImmediate(handle: ReturnType<typeof setImmediate>): void { this.callbacks.delete(handle); }
  flush(): void {
    for (const [handle, callback] of [...this.callbacks]) {
      this.callbacks.delete(handle);
      callback();
    }
  }
}

describe("InputPresentationCoordinator", () => {
  it("drains original safe deliveries once in order through one immediate opportunity", () => {
    const scheduler = new ImmediateScheduler();
    const delivered: string[] = [];
    const traces: PiTuiInputCoordinationTrace[] = [];
    let receipts = 0;
    const coordinator = new InputPresentationCoordinator({
      classify: data => classifyPiTuiInput(data, "editor"),
      deliver: data => delivered.push(data),
      onReceipt: () => { receipts += 1; },
      onTrace: event => traces.push(event),
      scheduler,
      now: () => traces.length,
    });

    coordinator.accept("a");
    coordinator.accept("e\u0301");
    coordinator.accept("\u001b[D");
    expect(delivered).toEqual([]);
    expect(receipts).toBe(3);
    expect(coordinator.pendingDepth).toBe(3);
    expect(coordinator.pendingPresentation).toBe(true);
    expect(scheduler.callbacks.size).toBe(1);

    scheduler.flush();
    expect(delivered).toEqual(["a", "e\u0301", "\u001b[D"]);
    expect(coordinator.appliedRevision).toBe(3);
    expect(coordinator.pendingDepth).toBe(0);
    expect(coordinator.pendingPresentation).toBe(false);
    expect(traces.filter(event => event.phase === "semantic-end").map(event => event.revision)).toEqual([1, 2, 3]);
  });

  it("flushes preceding safe input before an effectful barrier exactly once", () => {
    const scheduler = new ImmediateScheduler();
    const delivered: string[] = [];
    const coordinator = new InputPresentationCoordinator({
      classify: data => classifyPiTuiInput(data, "owned"),
      deliver: data => delivered.push(data),
      scheduler,
    });

    coordinator.accept("first");
    coordinator.accept("second");
    coordinator.accept("\r");
    expect(delivered).toEqual(["first", "second", "\r"]);
    expect(scheduler.callbacks.size).toBe(0);
    expect(coordinator.appliedRevision).toBe(3);
  });

  it("flushes on resize/lifecycle and can discard only after terminal ownership ends", () => {
    const scheduler = new ImmediateScheduler();
    const delivered: string[] = [];
    const coordinator = new InputPresentationCoordinator({
      classify: () => "safe",
      deliver: data => delivered.push(data),
      scheduler,
    });
    coordinator.accept("kept");
    coordinator.flush();
    expect(delivered).toEqual(["kept"]);
    coordinator.accept("discarded-after-stop");
    coordinator.dispose(false);
    scheduler.flush();
    expect(delivered).toEqual(["kept"]);
  });
});

describe("classifyPiTuiInput", () => {
  it.each([
    ["a", "editor", "safe"],
    ["multi word", "editor", "safe"],
    ["👩🏽‍💻", "editor", "safe"],
    ["\u007f", "editor", "safe"],
    ["\u001b[B", "owned", "safe"],
    ["\r", "editor", "barrier"],
    ["\u001b", "owned", "barrier"],
    ["\u001b[200~paste\u001b[201~", "editor", "barrier"],
    ["\u001b[<64;5;4M", "editor", "barrier"],
    ["\u001b[?1;2c", "editor", "barrier"],
    ["text", "opaque", "barrier"],
    ["\ud800", "editor", "barrier"],
  ] as const)("classifies %j on %s as %s", (data, surface, decision) => {
    expect(classifyPiTuiInput(data, surface)).toBe(decision);
  });
});

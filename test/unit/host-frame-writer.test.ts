import { describe, expect, it } from "vitest";
import { HostFrameWriter, type DrainAwareHostOutput, type HostFrame } from "../../src/ui/host-frame-writer.js";

class ControlledOutput implements DrainAwareHostOutput {
  readonly writes: string[] = [];
  accept = true;
  #drain: (() => void) | null = null;
  write(data: string): boolean { this.writes.push(data); return this.accept; }
  once(event: "drain", listener: () => void): void { if (event === "drain") this.#drain = listener; }
  drain(): void { this.accept = true; const listener = this.#drain; this.#drain = null; listener?.(); }
}

class CompletionAwareOutput implements DrainAwareHostOutput {
  readonly writes: string[] = [];
  #completion: (() => void) | null = null;
  write(data: string, callback?: () => void): boolean {
    this.writes.push(data);
    if (callback) this.#completion = callback;
    return true;
  }
  completePayload(): void {
    const completion = this.#completion;
    this.#completion = null;
    completion?.();
  }
}

function frame(payload: string, overrides: Partial<HostFrame> = {}): HostFrame {
  return { kind: "transaction", payload, synchronized: true, supersedableState: true, ...overrides };
}

describe("backpressure-aware host frame writer", () => {
  it("awaits drain and merges only consecutive superseded cell/cursor state under one balanced transaction", async () => {
    const output = new ControlledOutput();
    const writer = new HostFrameWriter(output);
    output.accept = false;
    writer.enqueue(frame("FIRST", { revision: 1 }));
    writer.enqueue(frame("CELL-A", { revision: 2 }));
    writer.enqueue(frame("CELL-B", { revision: 3 }));
    writer.enqueue(frame("SCROLL", { revision: 4, supersedableState: false }));

    expect(output.writes).toHaveLength(1);
    expect(writer.backpressured).toBe(true);
    expect(writer.queuedFrames).toBe(2);
    output.drain();
    await new Promise<void>(resolve => setImmediate(resolve));
    await new Promise<void>(resolve => setImmediate(resolve));
    await new Promise<void>(resolve => setImmediate(resolve));

    expect(output.writes).toHaveLength(9);
    const logicalWrites = [
      output.writes.slice(0, 3).join(""),
      output.writes.slice(3, 6).join(""),
      output.writes.slice(6, 9).join(""),
    ];
    expect(logicalWrites[1]).toContain("CELL-A");
    expect(logicalWrites[1]).toContain("CELL-B");
    expect(logicalWrites[1]?.match(/\x1b\[\?2026h/g) ?? []).toHaveLength(1);
    expect(logicalWrites[1]?.match(/\x1b\[\?2026l/g) ?? []).toHaveLength(1);
    expect(logicalWrites[2]).toContain("SCROLL");
  });

  it("keeps synchronized output open through payload completion and the following I/O turn", async () => {
    const output = new CompletionAwareOutput();
    const writer = new HostFrameWriter(output);
    writer.enqueue(frame("CONTENT", { revision: 1 }));

    expect(output.writes).toEqual(["\x1b[?2026h", "CONTENT"]);
    output.completePayload();
    expect(output.writes).toEqual(["\x1b[?2026h", "CONTENT"]);
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(output.writes).toEqual(["\x1b[?2026h", "CONTENT", "\x1b[?2026l"]);
  });

  it("fails boundedly rather than dropping or reordering non-supersedable operations", () => {
    const output = new ControlledOutput();
    const writer = new HostFrameWriter(output, { maxQueuedFrames: 2 });
    output.accept = false;
    writer.enqueue(frame("ACTIVE", { supersedableState: false }));
    writer.enqueue(frame("SCROLL-1", { supersedableState: false }));
    writer.enqueue(frame("ERASE-2", { supersedableState: false }));
    expect(() => writer.enqueue(frame("SCREEN-3", { supersedableState: false }))).toThrow(/queue exceeded 2 frames/i);
    expect(output.writes).toEqual(["\x1b[?2026h"]);
  });
});

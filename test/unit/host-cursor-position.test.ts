import { EventEmitter } from "node:events";
import { describe, expect, it } from "vitest";
import { queryHostCursorPosition } from "../../src/host-terminal/cursor-position.js";

class FakeInput extends EventEmitter {
  isTTY = true;
  isRaw = false;
  readonly rawTransitions: boolean[] = [];
  setRawMode(enabled: boolean): void { this.isRaw = enabled; this.rawTransitions.push(enabled); }
  resume(): this { return this; }
}

describe("host cursor position query", () => {
  it("captures a fragmented physical cursor response before handoff", async () => {
    const input = new FakeInput();
    const result = queryHostCursorPosition(input, {
      write() {
        queueMicrotask(() => {
          input.emit("data", Buffer.from("\x1b[12;"));
          input.emit("data", Buffer.from("7R"));
        });
      },
    }, 100);
    await expect(result).resolves.toEqual({ row: 11, column: 6 });
    expect(input.rawTransitions).toEqual([true, false]);
  });

  it("falls back within the deadline when the terminal does not respond", async () => {
    const input = new FakeInput();
    await expect(queryHostCursorPosition(input, { write() {} }, 5)).resolves.toBeNull();
    expect(input.rawTransitions).toEqual([true, false]);
  });
});

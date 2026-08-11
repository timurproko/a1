import { EventEmitter } from "node:events";
import { describe, expect, it } from "vitest";
import { WindowsHostTerminalAdapter, decodeInputRecord } from "../../src/host-terminal/windows.js";

class FakeInput extends EventEmitter {
  isTTY = true;
  isRaw = false;
  readonly rawTransitions: boolean[] = [];
  setRawMode(enabled: boolean): void { this.isRaw = enabled; this.rawTransitions.push(enabled); }
  resume(): this { return this; }
  pause(): this { return this; }
}

describe("Windows host terminal adapter", () => {
  it("restores the exact captured console mode after Node raw-mode cleanup", () => {
    const input = new FakeInput();
    const setModes: number[] = [];
    let output = "";
    const adapter = new WindowsHostTerminalAdapter(input, { write: value => { output += String(value); return true; } }, {
      getInputMode: () => 503,
      setInputMode: mode => { setModes.push(mode); return true; },
    });
    const captured = adapter.capture();
    adapter.enter();
    adapter.restore(captured);
    adapter.restore(captured);
    expect(input.rawTransitions).toEqual([true, false]);
    expect(setModes).toEqual([503]);
    expect(output.match(/\x1b\[\?1049h/g) ?? []).toHaveLength(0);
    expect(output.match(/\x1b\[\?1049l/g) ?? []).toHaveLength(0);
    expect(output).not.toContain("\x1b[2J");
    expect(output).toContain("\x1b[?9001l");
    expect(output).toContain("\x1b[0 q");
  });

  it("decodes ReadConsoleInputW key, repeat, wheel, focus, and resize records", () => {
    expect(decodeInputRecord({ type: "key", keyDown: true, repeatCount: 2, virtualKey: 38, scanCode: 72, unicode: 0, controlKeyState: 0x0110 })).toEqual([
      { type: "key", key: "ArrowUp", text: null, modifiers: { shift: true, alt: false, control: false, meta: false }, action: "press" },
      { type: "key", key: "ArrowUp", text: null, modifiers: { shift: true, alt: false, control: false, meta: false }, action: "repeat" },
    ]);
    expect(decodeInputRecord({ type: "mouse", x: 19, y: 9, buttonState: 120 << 16, controlKeyState: 0, eventFlags: 0x0004 })).toEqual([
      { type: "mouse", action: "wheel", button: "none", modifiers: { shift: false, alt: false, control: false, meta: false }, column: 19, row: 9, wheelDelta: 1 },
    ]);
    expect(decodeInputRecord({ type: "focus", focused: false })).toEqual([{ type: "focus", focused: false }]);
    expect(decodeInputRecord({ type: "resize", columns: 100, rows: 30 })).toEqual([{ type: "resize", dimensions: { columns: 100, rows: 30 } }]);
  });

  it("decodes Windows Terminal alternate-scroll arrows as three-row virtual wheel input", () => {
    const input = new FakeInput();
    const adapter = new WindowsHostTerminalAdapter(input, { write: () => true }, { getInputMode: () => 7, setInputMode: () => true });
    expect(adapter.decode(Buffer.from("\x1b[A"))).toMatchObject([{ type: "key", key: "ArrowUp" }]);
    expect(adapter.decode(Buffer.from("\x1b[B"))).toMatchObject([{ type: "key", key: "ArrowDown" }]);
    expect(adapter.decode(Buffer.from("\x1b[38;72;0;1;256;3_"))).toMatchObject([{ type: "mouse", action: "wheel", wheelDelta: 1 }]);
  });

  it("supports VTI and CSI ? 9001 key records through the documented fallback", () => {
    const input = new FakeInput();
    const adapter = new WindowsHostTerminalAdapter(input, { write: () => true }, { getInputMode: () => 7, setInputMode: () => true });
    const observed: unknown[] = [];
    const stop = adapter.startInput(events => observed.push(...events), false);
    input.emit("data", Buffer.from("\x1b[38;72;0;1;256;1_\x1b[<64;20;10M"));
    stop();
    expect(observed).toMatchObject([
      { type: "key", key: "ArrowUp", action: "press" },
      { type: "mouse", action: "wheel", column: 19, row: 9, wheelDelta: 1 },
    ]);
  });
});

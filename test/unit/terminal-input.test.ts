import { describe, expect, it } from "vitest";
import type { EffectiveTerminalModes, TerminalKeyEvent } from "../../src/domain/index.js";
import { ModeAwareTerminalInputEncoder, VtHostInputDecoder } from "../../src/terminal-input.js";

const legacyModes: EffectiveTerminalModes = {
  applicationCursorKeys: false,
  applicationKeypad: false,
  alternateScroll: false,
  bracketedPaste: false,
  focusReporting: false,
  mouseTracking: "none",
  mouseProtocol: "x10",
  synchronizedOutput: false,
  wraparound: true,
  keyboardProtocol: "legacy",
  modifyOtherKeys: 0,
  kittyKeyboardFlags: 0,
  win32InputMode: false,
};
const noModifiers = { shift: false, alt: false, control: false, meta: false };

describe("semantic terminal input", () => {
  it("decodes split SGR mouse, focus, paste, arrows, UTF-8, and Ctrl+C once", () => {
    const decoder = new VtHostInputDecoder();
    expect(decoder.push(Buffer.from("\x1b[<64;20"))).toEqual([]);
    const events = decoder.push(Buffer.from(";10M\x1b[I\x1b[200~π\n\x1b[201~\x1b[A\x03"));
    expect(events).toEqual([
      { type: "mouse", action: "wheel", button: "none", modifiers: noModifiers, column: 19, row: 9, wheelDelta: 1 },
      { type: "focus", focused: true },
      { type: "paste", text: "π\n" },
      { type: "key", key: "ArrowUp", text: null, modifiers: noModifiers, action: "press" },
      { type: "key", key: "c", text: null, modifiers: { ...noModifiers, control: true }, action: "press" },
    ]);
  });

  it("holds a lone escape briefly without confusing it with a split arrow", () => {
    const decoder = new VtHostInputDecoder();
    expect(decoder.push(Buffer.from("\x1b"))).toEqual([]);
    expect(decoder.push(Buffer.from("[B"))).toEqual([
      { type: "key", key: "ArrowDown", text: null, modifiers: noModifiers, action: "press" },
    ]);
    expect(decoder.push(Buffer.from("\x1b"))).toEqual([]);
    expect(decoder.flushPendingEscape()).toEqual([
      { type: "key", key: "Escape", text: null, modifiers: noModifiers, action: "press" },
    ]);
  });

  it("encodes child input from effective modes rather than host bytes", () => {
    const encoder = new ModeAwareTerminalInputEncoder();
    const up: TerminalKeyEvent = { type: "key", key: "ArrowUp", text: null, modifiers: noModifiers, action: "press" };
    expect(Buffer.from(encoder.encode(up, legacyModes, "alternate").bytes).toString()).toBe("\x1b[A");
    expect(Buffer.from(encoder.encode(up, { ...legacyModes, applicationCursorKeys: true }, "alternate").bytes).toString()).toBe("\x1bOA");
    expect(Buffer.from(encoder.encode({ type: "paste", text: "a\nb" }, { ...legacyModes, bracketedPaste: true }, "alternate").bytes).toString()).toBe("\x1b[200~a\nb\x1b[201~");
    expect(encoder.encode({ type: "focus", focused: true }, legacyModes, "alternate").route).toBe("ignored");
  });

  it("translates Kitty, modifyOtherKeys, and Win32 key protocols", () => {
    const encoder = new ModeAwareTerminalInputEncoder();
    const key: TerminalKeyEvent = { type: "key", key: "c", text: "c", modifiers: { ...noModifiers, control: true }, action: "press" };
    expect(Buffer.from(encoder.encode(key, { ...legacyModes, keyboardProtocol: "kitty", kittyKeyboardFlags: 7 }, "alternate").bytes).toString()).toBe("\x1b[99;5:1u");
    expect(Buffer.from(encoder.encode(key, { ...legacyModes, keyboardProtocol: "modify-other-keys", modifyOtherKeys: 2 }, "alternate").bytes).toString()).toBe("\x1b[27;5;99~");
    expect(Buffer.from(encoder.encode(key, { ...legacyModes, keyboardProtocol: "win32", win32InputMode: true }, "alternate").bytes).toString()).toBe("\x1b[67;0;3;1;8;1_");

    const decoder = new VtHostInputDecoder();
    expect(decoder.push(Buffer.from("\x1b[27;5;99~\x1b[99;5:1u"))).toMatchObject([
      { type: "key", key: "c", modifiers: { control: true } },
      { type: "key", key: "c", modifiers: { control: true } },
    ]);
  });

  it("routes wheel as mouse, alternate scroll, or virtual scrollback without becoming an ordinary key", () => {
    const encoder = new ModeAwareTerminalInputEncoder();
    const wheel = { type: "mouse" as const, action: "wheel" as const, button: "none" as const, modifiers: noModifiers, column: 19, row: 9, wheelDelta: 1 };
    const mouse = encoder.encode(wheel, { ...legacyModes, mouseTracking: "any", mouseProtocol: "sgr" }, "alternate");
    expect(Buffer.from(mouse.bytes).toString()).toBe("\x1b[<64;20;10M");
    expect(Buffer.from(encoder.encode(wheel, { ...legacyModes, alternateScroll: true, applicationCursorKeys: true }, "alternate").bytes).toString()).toBe("\x1bOA");
    expect(encoder.encode(wheel, legacyModes, "normal")).toMatchObject({ route: "virtual-scrollback" });
  });
});

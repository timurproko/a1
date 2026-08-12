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

  it("preserves every Ctrl+letter identity across Win32 host decoding and child protocols", () => {
    const encoder = new ModeAwareTerminalInputEncoder();
    const decoder = new VtHostInputDecoder();
    for (let offset = 1; offset <= 26; offset++) {
      const letter = String.fromCharCode(96 + offset);
      const virtualKey = 64 + offset;
      const [event] = decoder.push(Buffer.from(`\x1b[${virtualKey};0;${offset};1;8;1_`));
      expect(event).toEqual({ type: "key", key: letter, text: null, modifiers: { ...noModifiers, control: true }, action: "press" });
      expect(Buffer.from(encoder.encode(event!, legacyModes, "normal").bytes).toString("hex")).toBe(offset.toString(16).padStart(2, "0"));
      expect(Buffer.from(encoder.encode(event!, { ...legacyModes, keyboardProtocol: "modify-other-keys", modifyOtherKeys: 2 }, "normal").bytes).toString()).toBe(`\x1b[27;5;${letter.codePointAt(0)}~`);
      expect(Buffer.from(encoder.encode(event!, { ...legacyModes, keyboardProtocol: "kitty", kittyKeyboardFlags: 7 }, "normal").bytes).toString()).toBe(`\x1b[${letter.codePointAt(0)};5:1u`);
      expect(Buffer.from(encoder.encode(event!, { ...legacyModes, keyboardProtocol: "win32", win32InputMode: true }, "normal").bytes).toString()).toBe(`\x1b[${virtualKey};0;${offset};1;8;1_`);
    }
  });

  it("round-trips legacy C0 controls while retaining canonical Tab, Enter, and Escape ambiguity", () => {
    const encoder = new ModeAwareTerminalInputEncoder();
    const expectedKeys = [" ", ...Array.from({ length: 26 }, (_, index) => String.fromCharCode(97 + index)), "[", "\\", "]", "^", "_"];
    for (let code = 0; code < 32; code++) {
      const decoder = new VtHostInputDecoder();
      const pushed = decoder.push(Buffer.from([code]));
      const [event] = code === 27 ? decoder.flushPendingEscape() : pushed;
      const canonical = code === 9 ? "Tab" : code === 13 ? "Enter" : code === 27 ? "Escape" : expectedKeys[code];
      expect(event).toMatchObject({ type: "key", key: canonical, text: null, action: "press" });
      expect(Buffer.from(encoder.encode(event!, legacyModes, "normal").bytes)).toEqual(Buffer.from([code]));
    }
  });

  it("does not turn Win32 key releases into duplicate legacy or modifyOtherKeys presses", () => {
    const encoder = new ModeAwareTerminalInputEncoder();
    const decoder = new VtHostInputDecoder();
    const [release] = decoder.push(Buffer.from("\x1b[80;46;3;0;8;1_"));
    expect(release).toMatchObject({ type: "key", key: "c", text: null, action: "release" });
    expect(encoder.encode(release!, legacyModes, "normal").bytes).toHaveLength(0);
    expect(encoder.encode(release!, { ...legacyModes, keyboardProtocol: "modify-other-keys", modifyOtherKeys: 2 }, "normal").bytes).toHaveLength(0);
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

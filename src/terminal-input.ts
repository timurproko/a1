import { StringDecoder } from "node:string_decoder";
import type { EffectiveTerminalModes, EncodedTerminalInput, HostTerminalInputEvent, KeyModifiers, TerminalInputEncoder, TerminalKeyEvent, TerminalMouseEvent } from "./domain/index.js";

const NONE: KeyModifiers = { shift: false, alt: false, control: false, meta: false };

/** Incrementally decodes xterm-compatible physical input into semantic events. */
export class VtHostInputDecoder {
  #decoder = new StringDecoder("utf8");
  #pending = "";

  push(chunk: Uint8Array): readonly HostTerminalInputEvent[] {
    this.#pending += this.#decoder.write(Buffer.from(chunk));
    const events: HostTerminalInputEvent[] = [];
    while (this.#pending) {
      const paste = /^\x1b\[200~([\s\S]*?)\x1b\[201~/.exec(this.#pending);
      if (paste) {
        events.push({ type: "paste", text: paste[1] ?? "" });
        this.#pending = this.#pending.slice(paste[0].length);
        continue;
      }
      if (this.#pending.startsWith("\x1b[200~")) break;

      const mouse = /^\x1b\[<(\d+);(\d+);(\d+)([Mm])/.exec(this.#pending);
      if (mouse) {
        events.push(decodeMouse(Number(mouse[1]), Number(mouse[2]), Number(mouse[3]), mouse[4] === "m"));
        this.#pending = this.#pending.slice(mouse[0].length);
        continue;
      }
      if (this.#pending.startsWith("\x1b[I") || this.#pending.startsWith("\x1b[O")) {
        events.push({ type: "focus", focused: this.#pending[2] === "I" });
        this.#pending = this.#pending.slice(3);
        continue;
      }

      const win32 = /^\x1b\[(\d+);(\d+);(\d+);([01]);(\d+);(\d+)_/.exec(this.#pending);
      if (win32) {
        events.push(decodeWin32Key(win32));
        this.#pending = this.#pending.slice(win32[0].length);
        continue;
      }
      const modified = /^\x1b\[27;(\d+);(\d+)~/.exec(this.#pending);
      if (modified) {
        const codepoint = Number(modified[2]);
        events.push({ type: "key", key: keyFromCodepoint(codepoint), text: codepoint >= 32 ? String.fromCodePoint(codepoint) : null, modifiers: modifiersFromKitty(Math.max(0, Number(modified[1]) - 1)), action: "press" });
        this.#pending = this.#pending.slice(modified[0].length);
        continue;
      }
      const kitty = /^\x1b\[(\d+);(\d+)(?::(\d+))?u/.exec(this.#pending);
      if (kitty) {
        const codepoint = Number(kitty[1]);
        const modifierValue = Math.max(0, Number(kitty[2]) - 1);
        const eventKind = Number(kitty[3] ?? 1);
        events.push({
          type: "key",
          key: keyFromCodepoint(codepoint),
          text: codepoint >= 32 ? String.fromCodePoint(codepoint) : null,
          modifiers: modifiersFromKitty(modifierValue),
          action: eventKind === 3 ? "release" : eventKind === 2 ? "repeat" : "press",
        });
        this.#pending = this.#pending.slice(kitty[0].length);
        continue;
      }

      if (isIncompleteEscape(this.#pending)) break;
      const legacy = decodeLegacyKey(this.#pending);
      if (legacy) {
        events.push(legacy.event);
        this.#pending = this.#pending.slice(legacy.length);
        continue;
      }

      const codepoint = this.#pending.codePointAt(0);
      if (codepoint === undefined) break;
      const text = String.fromCodePoint(codepoint);
      events.push({ type: "key", key: text, text, modifiers: NONE, action: "press" });
      this.#pending = this.#pending.slice(text.length);
    }
    return events;
  }

  flushPendingEscape(): readonly HostTerminalInputEvent[] {
    if (this.#pending !== "\x1b") return [];
    this.#pending = "";
    return [{ type: "key", key: "Escape", text: null, modifiers: NONE, action: "press" }];
  }
}

/** Encodes semantic events for the focused child's effective terminal modes. */
export class ModeAwareTerminalInputEncoder implements TerminalInputEncoder {
  encode(event: HostTerminalInputEvent, modes: EffectiveTerminalModes, activeScreen: "normal" | "alternate"): EncodedTerminalInput {
    if (event.type === "resize") return { route: "ignored", bytes: Buffer.alloc(0) };
    if (event.type === "paste") {
      const text = Buffer.from(event.text, "utf8");
      return child(modes.bracketedPaste ? Buffer.concat([Buffer.from("\x1b[200~"), text, Buffer.from("\x1b[201~")]) : text);
    }
    if (event.type === "focus") return modes.focusReporting ? child(Buffer.from(event.focused ? "\x1b[I" : "\x1b[O")) : ignored();
    if (event.type === "mouse") return encodeMouse(event, modes, activeScreen);
    return child(Buffer.from(encodeKey(event, modes), "utf8"));
  }
}

function encodeMouse(event: TerminalMouseEvent, modes: EffectiveTerminalModes, activeScreen: "normal" | "alternate"): EncodedTerminalInput {
  if (modes.mouseTracking === "none") {
    if (event.action === "wheel" && modes.alternateScroll && activeScreen === "alternate") {
      const key: TerminalKeyEvent = { type: "key", key: event.wheelDelta > 0 ? "ArrowUp" : "ArrowDown", text: null, modifiers: event.modifiers, action: "press" };
      return child(Buffer.from(encodeKey(key, modes), "utf8"));
    }
    return event.action === "wheel" ? { route: "virtual-scrollback", bytes: Buffer.alloc(0) } : ignored();
  }
  let button = event.action === "wheel"
    ? event.wheelDelta > 0 ? 64 : 65
    : event.button === "left" ? 0 : event.button === "middle" ? 1 : event.button === "right" ? 2 : 3;
  if (event.action === "move") button |= 32;
  if (event.modifiers.shift) button |= 4;
  if (event.modifiers.alt) button |= 8;
  if (event.modifiers.control) button |= 16;
  const column = event.column + 1;
  const row = event.row + 1;
  if (modes.mouseProtocol === "sgr") return child(Buffer.from(`\x1b[<${button};${column};${row}${event.action === "release" ? "m" : "M"}`));
  if (modes.mouseProtocol === "urxvt") return child(Buffer.from(`\x1b[${button + 32};${column};${row}M`));
  const encodeCoordinate = modes.mouseProtocol === "utf8" ? String.fromCodePoint : String.fromCharCode;
  return child(Buffer.from(`\x1b[M${String.fromCharCode(button + 32)}${encodeCoordinate(column + 32)}${encodeCoordinate(row + 32)}`));
}

function encodeKey(event: TerminalKeyEvent, modes: EffectiveTerminalModes): string {
  if (event.action === "release" && modes.keyboardProtocol === "legacy") return "";
  if (modes.keyboardProtocol === "win32") return encodeWin32Key(event);
  if (modes.keyboardProtocol === "kitty") {
    const codepoint = keyCodepoint(event);
    const modifiers = 1 + (event.modifiers.shift ? 1 : 0) + (event.modifiers.alt ? 2 : 0) + (event.modifiers.control ? 4 : 0) + (event.modifiers.meta ? 8 : 0);
    const kind = event.action === "repeat" ? 2 : event.action === "release" ? 3 : 1;
    return `\x1b[${codepoint};${modifiers}:${kind}u`;
  }
  if (modes.keyboardProtocol === "modify-other-keys" && (event.modifiers.shift || event.modifiers.alt || event.modifiers.control)) {
    const modifiers = 1 + (event.modifiers.shift ? 1 : 0) + (event.modifiers.alt ? 2 : 0) + (event.modifiers.control ? 4 : 0) + (event.modifiers.meta ? 8 : 0);
    return `\x1b[27;${modifiers};${keyCodepoint(event)}~`;
  }
  const application = modes.applicationCursorKeys;
  const named: Record<string, string> = {
    ArrowUp: application ? "\x1bOA" : "\x1b[A",
    ArrowDown: application ? "\x1bOB" : "\x1b[B",
    ArrowRight: application ? "\x1bOC" : "\x1b[C",
    ArrowLeft: application ? "\x1bOD" : "\x1b[D",
    Enter: "\r",
    Tab: "\t",
    Escape: "\x1b",
    Backspace: "\x7f",
    Delete: "\x1b[3~",
    Home: "\x1b[H",
    End: "\x1b[F",
    PageUp: "\x1b[5~",
    PageDown: "\x1b[6~",
  };
  if (named[event.key]) return named[event.key] as string;
  if (event.modifiers.control && event.key.length === 1) {
    const code = event.key.toUpperCase().charCodeAt(0);
    if (code >= 64 && code <= 95) return String.fromCharCode(code - 64);
  }
  const text = event.text ?? event.key;
  return event.modifiers.alt ? `\x1b${text}` : text;
}

function encodeWin32Key(event: TerminalKeyEvent): string {
  const named: Record<string, [number, number, number]> = {
    ArrowUp: [38, 72, 0], ArrowDown: [40, 80, 0], ArrowRight: [39, 77, 0], ArrowLeft: [37, 75, 0],
    Enter: [13, 28, 13], Tab: [9, 15, 9], Escape: [27, 1, 27], Backspace: [8, 14, 8], Delete: [46, 83, 0],
    Home: [36, 71, 0], End: [35, 79, 0], PageUp: [33, 73, 0], PageDown: [34, 81, 0],
  };
  const text = event.text ?? "";
  const codepoint = event.modifiers.control && event.key.length === 1 ? event.key.toUpperCase().charCodeAt(0) - 64 : text.codePointAt(0) ?? 0;
  const [virtualKey, scanCode, unicode] = named[event.key] ?? [event.key.length === 1 ? event.key.toUpperCase().charCodeAt(0) : 0, 0, codepoint];
  const controlState = (event.modifiers.alt ? 2 : 0) | (event.modifiers.control ? 8 : 0) | (event.modifiers.shift ? 16 : 0) | (unicode === 0 ? 256 : 0);
  return `\x1b[${virtualKey};${scanCode};${unicode};${event.action === "release" ? 0 : 1};${controlState};1_`;
}

function decodeMouse(buttonCode: number, column: number, row: number, release: boolean): TerminalMouseEvent {
  const wheel = (buttonCode & 64) !== 0;
  const motion = (buttonCode & 32) !== 0;
  const button = buttonCode & 3;
  return {
    type: "mouse",
    action: wheel ? "wheel" : motion ? "move" : release ? "release" : "press",
    button: wheel || button === 3 ? "none" : button === 0 ? "left" : button === 1 ? "middle" : "right",
    modifiers: { shift: (buttonCode & 4) !== 0, alt: (buttonCode & 8) !== 0, control: (buttonCode & 16) !== 0, meta: false },
    column: Math.max(0, column - 1),
    row: Math.max(0, row - 1),
    wheelDelta: wheel ? (buttonCode & 1) === 0 ? 1 : -1 : 0,
  };
}

function decodeWin32Key(match: RegExpExecArray): TerminalKeyEvent {
  const virtualKey = Number(match[1]);
  const unicode = Number(match[3]);
  const down = match[4] === "1";
  const controlState = Number(match[5]);
  const named: Record<number, string> = { 8: "Backspace", 9: "Tab", 13: "Enter", 27: "Escape", 33: "PageUp", 34: "PageDown", 35: "End", 36: "Home", 37: "ArrowLeft", 38: "ArrowUp", 39: "ArrowRight", 40: "ArrowDown", 46: "Delete" };
  const text = unicode >= 32 ? String.fromCodePoint(unicode) : null;
  const controlKey = unicode > 0 && unicode < 32 && virtualKey >= 65 && virtualKey <= 90
    ? String.fromCharCode(virtualKey).toLowerCase()
    : null;
  return {
    type: "key",
    key: named[virtualKey] ?? controlKey ?? text ?? String.fromCharCode(virtualKey).toLowerCase(),
    text,
    modifiers: { shift: (controlState & 16) !== 0, alt: (controlState & 3) !== 0, control: (controlState & 12) !== 0, meta: false },
    action: down ? Number(match[6]) > 1 ? "repeat" : "press" : "release",
  };
}

function decodeLegacyKey(value: string): { event: TerminalKeyEvent; length: number } | null {
  const named: readonly [string, string][] = [
    ["\x1b[3~", "Delete"], ["\x1b[5~", "PageUp"], ["\x1b[6~", "PageDown"], ["\x1b[A", "ArrowUp"], ["\x1b[B", "ArrowDown"],
    ["\x1b[C", "ArrowRight"], ["\x1b[D", "ArrowLeft"], ["\x1bOA", "ArrowUp"], ["\x1bOB", "ArrowDown"], ["\x1bOC", "ArrowRight"],
    ["\x1bOD", "ArrowLeft"], ["\x1b[H", "Home"], ["\x1b[F", "End"], ["\r", "Enter"], ["\t", "Tab"], ["\x7f", "Backspace"], ["\x1b", "Escape"],
  ];
  for (const [sequence, key] of named) {
    if (value.startsWith(sequence)) return { event: { type: "key", key, text: null, modifiers: NONE, action: "press" }, length: sequence.length };
  }
  const code = value.charCodeAt(0);
  if (code > 0 && code < 27) {
    return { event: { type: "key", key: String.fromCharCode(code + 96), text: null, modifiers: { ...NONE, control: true }, action: "press" }, length: 1 };
  }
  return null;
}

function isIncompleteEscape(value: string): boolean {
  return value === "\x1b" || /^\x1b\[[?<>=]?[0-9;:]*$/.test(value) || value === "\x1bO";
}
function modifiersFromKitty(value: number): KeyModifiers {
  return { shift: (value & 1) !== 0, alt: (value & 2) !== 0, control: (value & 4) !== 0, meta: (value & 8) !== 0 };
}
function keyFromCodepoint(value: number): string {
  return ({ 13: "Enter", 27: "Escape", 127: "Backspace", 57352: "ArrowUp", 57353: "ArrowDown", 57354: "ArrowRight", 57355: "ArrowLeft" } as Record<number, string>)[value] ?? String.fromCodePoint(value);
}
function keyCodepoint(event: TerminalKeyEvent): number {
  return ({ Enter: 13, Escape: 27, Backspace: 127, ArrowUp: 57352, ArrowDown: 57353, ArrowRight: 57354, ArrowLeft: 57355 } as Record<string, number>)[event.key] ?? (event.text ?? event.key).codePointAt(0) ?? 0;
}
function child(bytes: Uint8Array): EncodedTerminalInput { return { route: "child", bytes }; }
function ignored(): EncodedTerminalInput { return { route: "ignored", bytes: Buffer.alloc(0) }; }

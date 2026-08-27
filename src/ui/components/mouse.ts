import type { PaneMouseEvent } from "./pane.js";

/**
 * SGR mouse reporting. A screen that wants hover, click, and drag needs the
 * terminal to send reports; nothing else in A1 turns this on, and the sequences
 * are paired so the terminal is always left as it was found.
 */
export const MOUSE_TRACKING_ON = "\u001b[?1006h\u001b[?1000h\u001b[?1003h";
export const MOUSE_TRACKING_OFF = "\u001b[?1003l\u001b[?1000l\u001b[?1006l";

const SGR_PATTERN = /\u001b\[<(\d+);(\d+);(\d+)([Mm])/g;

export interface ParsedMouseInput {
  readonly events: readonly PaneMouseEvent[];
  /** Input with every mouse report removed, for ordinary key handling. */
  readonly rest: string;
}

/** Extracts SGR mouse reports, leaving any keyboard input untouched. */
export function parseMouseInput(data: string): ParsedMouseInput {
  if (!data.includes("\u001b[<")) return { events: [], rest: data };

  const events: PaneMouseEvent[] = [];
  let rest = "";
  let index = 0;
  SGR_PATTERN.lastIndex = 0;
  for (let match = SGR_PATTERN.exec(data); match !== null; match = SGR_PATTERN.exec(data)) {
    rest += data.slice(index, match.index);
    index = match.index + match[0].length;

    const code = Number.parseInt(match[1] ?? "", 10);
    const column = Number.parseInt(match[2] ?? "", 10);
    const row = Number.parseInt(match[3] ?? "", 10);
    const released = match[4] === "m";
    if (!Number.isInteger(code) || !Number.isInteger(column) || !Number.isInteger(row)) continue;

    const event = toEvent(code, column, row, released);
    if (event !== null) events.push(event);
  }
  rest += data.slice(index);
  return { events: Object.freeze(events), rest };
}

export interface RoutedMouseInput {
  /** Input left for the TUI after only claimed reports were removed. */
  readonly data: string;
  readonly consumed: boolean;
}

/**
 * Routes every SGR report independently, preserving keyboard bytes and mouse
 * reports the caller does not claim even when they share one physical chunk.
 */
export function routeMouseInput(
  data: string,
  claim: (event: PaneMouseEvent) => boolean,
): RoutedMouseInput {
  if (!data.includes("\u001b[<")) return { data, consumed: false };
  let output = "";
  let index = 0;
  let consumed = false;
  SGR_PATTERN.lastIndex = 0;
  for (let match = SGR_PATTERN.exec(data); match !== null; match = SGR_PATTERN.exec(data)) {
    output += data.slice(index, match.index);
    index = match.index + match[0].length;
    const event = toEvent(
      Number.parseInt(match[1] ?? "", 10),
      Number.parseInt(match[2] ?? "", 10),
      Number.parseInt(match[3] ?? "", 10),
      match[4] === "m",
    );
    if (event !== null && claim(event)) consumed = true;
    else output += match[0];
  }
  output += data.slice(index);
  return { data: output, consumed };
}

function toEvent(code: number, column: number, row: number, released: boolean): PaneMouseEvent | null {
  if ((code & 64) !== 0) {
    const kind = (code & 1) === 0 ? "wheel-up" : "wheel-down";
    return { kind, button: 0, column, row };
  }
  const button = code & 3;
  if ((code & 32) !== 0) return { kind: "motion", button, column, row };
  if (released) return { kind: "release", button, column, row };
  if (button === 3) return { kind: "release", button: 0, column, row };
  return { kind: "press", button, column, row };
}

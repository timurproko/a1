import type { PaneMouseEvent } from "./pane.js";

/**
 * SGR mouse reporting. A screen that wants hover, click, and drag needs the
 * terminal to send reports; nothing else in A1 turns this on, and the sequences
 * are paired so the terminal is always left as it was found.
 */
export const MOUSE_TRACKING_ON = "[?1006h[?1000h[?1003h";
export const MOUSE_TRACKING_OFF = "[?1003l[?1000l[?1006l";

const SGR_PATTERN = /\[<(\d+);(\d+);(\d+)([Mm])/g;

export interface ParsedMouseInput {
  readonly events: readonly PaneMouseEvent[];
  /** Input with every mouse report removed, for ordinary key handling. */
  readonly rest: string;
}

/** Extracts SGR mouse reports, leaving any keyboard input untouched. */
export function parseMouseInput(data: string): ParsedMouseInput {
  if (!data.includes("[<")) return { events: [], rest: data };

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

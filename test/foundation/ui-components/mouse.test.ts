import { describe, expect, it } from "vitest";
import {
  MOUSE_TRACKING_OFF,
  MOUSE_TRACKING_ON,
  parseMouseInput,
  toPaneLocalMouse,
} from "../../../src/foundation/ui-components/index.js";

const ESC = "";

describe("decoding pointer input", () => {
  it("decodes a press and its release with a one-based position", () => {
    const press = parseMouseInput(`${ESC}[<0;12;5M`);
    expect(press.events).toEqual([{ kind: "press", button: 0, column: 12, row: 5 }]);

    const release = parseMouseInput(`${ESC}[<0;12;5m`);
    expect(release.events).toEqual([{ kind: "release", button: 0, column: 12, row: 5 }]);
  });

  it("decodes motion rather than a press", () => {
    expect(parseMouseInput(`${ESC}[<35;7;3M`).events)
      .toEqual([{ kind: "motion", button: 3, column: 7, row: 3 }]);
  });

  it("decodes both wheel directions", () => {
    expect(parseMouseInput(`${ESC}[<64;1;1M`).events[0]?.kind).toBe("wheel-up");
    expect(parseMouseInput(`${ESC}[<65;1;1M`).events[0]?.kind).toBe("wheel-down");
  });

  it("decodes a non-left button", () => {
    expect(parseMouseInput(`${ESC}[<2;4;9M`).events)
      .toEqual([{ kind: "press", button: 2, column: 4, row: 9 }]);
  });

  it("keeps typed characters in the same chunk", () => {
    const parsed = parseMouseInput(`ab${ESC}[<0;1;1Mcd${ESC}[<0;2;2mef`);
    expect(parsed.events).toHaveLength(2);
    expect(parsed.rest).toBe("abcdef");
  });

  it("passes a chunk with no reports through untouched", () => {
    const parsed = parseMouseInput(`${ESC}[A`);
    expect(parsed.events).toHaveLength(0);
    expect(parsed.rest).toBe(`${ESC}[A`);
  });

  it("ignores an incomplete or malformed report without leaking keystrokes", () => {
    for (const raw of [`${ESC}[<0;12M`, `${ESC}[<;;M`, `${ESC}[<0;12;`]) {
      const parsed = parseMouseInput(raw);
      expect(parsed.events).toHaveLength(0);
      expect(parsed.rest).toBe(raw);
    }
  });

  it("decodes repeated reports without regex state leaking between calls", () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      expect(parseMouseInput(`${ESC}[<0;5;5M`).events).toHaveLength(1);
    }
  });
});

describe("pane-local translation", () => {
  it("reports coordinates relative to the pane origin", () => {
    const event = { kind: "press", button: 0, column: 12, row: 5 } as const;
    expect(toPaneLocalMouse(event, { column: 10, row: 3 }))
      .toEqual({ kind: "press", button: 0, column: 3, row: 3 });
  });
});

describe("tracking sequences", () => {
  it("pairs every mode it enables with a disable", () => {
    const modes = (sequence: string): string[] =>
      [...sequence.matchAll(/\[\?(\d+)[hl]/g)].map(match => match[1] ?? "");
    expect(modes(MOUSE_TRACKING_ON).sort()).toEqual(modes(MOUSE_TRACKING_OFF).sort());
    expect(MOUSE_TRACKING_ON.endsWith("h")).toBe(true);
    expect(MOUSE_TRACKING_OFF.endsWith("l")).toBe(true);
  });

  it("requests any-event reporting so hover is delivered", () => {
    expect(MOUSE_TRACKING_ON).toContain("[?1003h");
    expect(MOUSE_TRACKING_ON).toContain("[?1006h");
  });

  it("does not touch the alternate screen", () => {
    expect(MOUSE_TRACKING_ON).not.toContain("1049");
    expect(MOUSE_TRACKING_OFF).not.toContain("1049");
  });
});

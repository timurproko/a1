import { stripTerminalSequences, visibleWidth } from "@earendil-works/pi-tui";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPiSessionNameMenu, ensureTheme, piTheme, setPiAccentColor } from "../../../../src/integrations/pi/components/index.js";
import { cellBackgroundAt, cellStyle } from "../../../support/ansi-cell-style.js";

afterEach(() => { setPiAccentColor("blue"); });

describe("session name popup style", () => {
  it("matches the pre-pivot borderless dark popup and changes only background on hover", () => {
    ensureTheme();
    const edit = vi.fn();
    const menu = createPiSessionNameMenu(edit, vi.fn(), vi.fn());
    const rest = menu.render(6)[0]!;
    expect(stripTerminalSequences(rest)).toBe(" Edit ");
    expect(cellBackgroundAt(rest, 0)).toBe(piTheme().getColorMode() === "truecolor" ? "38;38;38" : "palette:235");
    expect(rest).not.toContain("\x1b[1m");
    menu.handleInput!("\r");
    expect(edit).not.toHaveBeenCalled();
    menu.handleLocalMouse!({ kind: "motion", button: 3, column: 3, row: 1 });
    const hovered = menu.render(6)[0]!;
    expect(cellStyle(hovered, "E")).toEqual(cellStyle(rest, "E"));
    for (let column = 0; column < 6; column++) {
      expect(cellBackgroundAt(hovered, column)).toBe(cellBackgroundAt(piTheme().bg("selectedBg", "x"), 0));
    }
    setPiAccentColor("green");
    expect(cellBackgroundAt(menu.render(6)[0]!, 0)).toBe(cellBackgroundAt(piTheme().bg("selectedBg", "x"), 0));
    menu.handleLocalMouse!({ kind: "motion", button: 3, column: 0, row: 1 });
    expect(menu.render(6)[0]).toBe(rest);
    for (const width of [1, 2, 3, 4, 6]) expect(visibleWidth(menu.render(width)[0]!)).toBeLessThanOrEqual(width);
  });

  it("supports pointer and keyboard action without extra labels or prompt input", () => {
    ensureTheme();
    const edit = vi.fn(), cancel = vi.fn();
    const menu = createPiSessionNameMenu(edit, cancel, vi.fn());
    menu.handleInput!("typed text");
    expect(stripTerminalSequences(menu.render(6)[0]!)).toBe(" Edit ");
    menu.handleInput!("\x1b[B");
    menu.handleInput!("\r");
    expect(edit).toHaveBeenCalledTimes(1);
    menu.handleLocalMouse!({ kind: "press", button: 0, column: 3, row: 1 });
    expect(edit).toHaveBeenCalledTimes(2);
    menu.handleInput!("\x1b");
    menu.handleInput!("\x03");
    expect(cancel).toHaveBeenCalledTimes(2);
  });
});

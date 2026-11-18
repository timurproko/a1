import { colorToRgb, foregroundAnsi, stripTerminalSequences, visibleWidth } from "@earendil-works/pi-tui";
import { describe, expect, it, vi } from "vitest";
import { componentPort } from "../../../../src/integrations/pi/components/index.js";
import {
  applyPiTheme,
  applyPiThemeInstance,
  piTheme,
  piUiTheme,
  renderPiModalListRow,
} from "../../../../src/integrations/pi/components/theme.js";
import { cellBackgroundAt, cellStyle } from "../../../support/ansi-cell-style.js";
import { renderListRow } from "../../../../src/ui/components/index.js";
import { withPiParityColorMode } from "../../../support/pi-terminal-capabilities.js";

describe("standard dialog selection rows", () => {
  it.each(["truecolor", "256color"] as const)("shares the subtle foreground hover with Settings values (%s)", mode => {
    withPiParityColorMode(mode, () => {
      const previous = piTheme();
      try {
        applyPiTheme("dark", false, mode);
        const theme = piUiTheme();
        for (const selected of [false, true]) {
          const row = { key: "setting", label: "Setting", value: "auto" };
          const rest = renderListRow(row, { selected, hovered: false, region: "value" }, 24, 80, theme);
          const hover = renderListRow(row, { selected, hovered: true, region: "value" }, 24, 80, theme);
          expect(cellStyle(hover, "u")).toEqual(cellStyle(theme.hover!("muted", "u"), "u"));
          expect(cellStyle(hover, "u")).not.toEqual(cellStyle(rest, "u"));
          expect(cellStyle(hover, "u")).not.toEqual(cellStyle(theme.fg("accent", "u"), "u"));
          expect(cellBackgroundAt(hover, 24)).toBe(cellBackgroundAt(rest, 24));
          expect(stripTerminalSequences(hover)).toBe(stripTerminalSequences(rest));
        }
      } finally { applyPiThemeInstance(previous); }
    });
  });

  it("retains explicit pointer and cancellation capabilities through component ports", () => {
    const component = { render: () => [], invalidate() {}, handleLocalMouse: vi.fn(), clearMouseHover: vi.fn(), cancelDialog: vi.fn() };
    const port = componentPort(component);
    const event = { kind: "motion" as const, button: 3, column: 4, row: 2 };
    port.handleLocalMouse?.(event);
    port.clearMouseHover?.();
    port.cancelDialog?.();
    expect(component.handleLocalMouse).toHaveBeenCalledWith(event);
    expect(component.clearMouseHover).toHaveBeenCalledTimes(1);
    expect(component.cancelDialog).toHaveBeenCalledTimes(1);
    expect(componentPort({ render: () => [], invalidate() {} }).cancelDialog).toBeUndefined();
  });

  it.each(["truecolor", "256color"] as const)("blends hover text by 25 percent without changing active backgrounds (%s)", mode => {
    withPiParityColorMode(mode, () => {
      const previous = piTheme();
      try {
        applyPiTheme("dark", false, mode);
        const theme = piTheme();
        const ui = piUiTheme();
        const accent = colorToRgb(theme.colors.accent);
        for (const token of ["text", "muted", "success"] as const) {
          const base = colorToRgb(theme.colors[token]);
          const expected = { kind: "rgb" as const,
            r: Math.round(base.r * 0.75 + accent.r * 0.25),
            g: Math.round(base.g * 0.75 + accent.g * 0.25),
            b: Math.round(base.b * 0.75 + accent.b * 0.25) };
          const painted = ui.hover!(token, "東京");
          expect(painted).toBe(`${foregroundAnsi(expected, mode)}東京\u001b[39m`);
          expect(visibleWidth(painted)).toBe(4);
          expect(painted).not.toMatch(/\u001b\[(?:48|4m|7m)/u);
          const selected = renderPiModalListRow(painted, 10, true);
          expect(cellBackgroundAt(selected, 0)).toBe(cellBackgroundAt(theme.bg("selectedBg", "x"), 0));
          expect(cellBackgroundAt(selected, 1)).toBe(cellBackgroundAt(theme.bg("selectedBg", "x"), 0));
        }
      } finally { applyPiThemeInstance(previous); }
    });
  });

  it("paints only the selected item span while preserving semantic foregrounds and clipping", () => {
    withPiParityColorMode("truecolor", () => {
      const previousTheme = piTheme();
      try {
        applyPiTheme("dark", false, "truecolor");
        const theme = piTheme();
        const content = theme.fg("accent", "→ ") + theme.fg("text", "primary") + " " + theme.fg("muted", "description");
        const selected = renderPiModalListRow(content, 40, true);
        const selectionBackground = cellBackgroundAt(theme.bg("selectedBg", "x"), 0);
        const selectedText = stripTerminalSequences(selected);

        expect(visibleWidth(selected)).toBe(21);
        expect(selectedText).toBe("→ primary description");
        expect(cellBackgroundAt(selected, 0)).toBe(selectionBackground);
        expect(cellBackgroundAt(selected, selectedText.length - 1)).toBe(selectionBackground);
        expect(cellStyle(selected, "→")).toEqual(cellStyle(theme.fg("accent", "→"), "→"));
        expect(cellStyle(selected, "p")).toEqual(cellStyle(theme.fg("text", "p"), "p"));
        expect(cellStyle(selected, "d")).toEqual(cellStyle(theme.fg("muted", "d"), "d"));
        expect(selected).not.toContain("\u001b[1m");

        const narrow = renderPiModalListRow(content, 7, true);
        expect(visibleWidth(narrow)).toBe(7);
        expect(cellBackgroundAt(narrow, 6)).toBe(selectionBackground);

        const unselected = renderPiModalListRow(theme.fg("accent", "plain"), 18, false);
        expect(stripTerminalSequences(unselected)).toBe("plain");
        expect(cellBackgroundAt(unselected, 0)).toBe("default");
      } finally {
        applyPiThemeInstance(previousTheme);
      }
    });
  });
});

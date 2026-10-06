import { stripTerminalSequences, visibleWidth } from "@earendil-works/pi-tui";
import { describe, expect, it } from "vitest";
import {
  applyPiTheme,
  applyPiThemeInstance,
  piTheme,
  renderPiModalListRow,
} from "../../../../src/integrations/pi/components/theme.js";
import { cellBackgroundAt, cellStyle } from "../../../support/ansi-cell-style.js";
import { withPiParityColorMode } from "../../../support/pi-terminal-capabilities.js";

describe("standard dialog selection rows", () => {
  it("paints only the selected item span while preserving semantic foregrounds and clipping", () => {
    withPiParityColorMode("truecolor", () => {
      const previousTheme = piTheme();
      try {
        applyPiTheme("dark", false, "truecolor");
        const theme = piTheme();
        const content = theme.fg("accent", "→ primary") + " " + theme.fg("muted", "description");
        const selected = renderPiModalListRow(content, 40, true);
        const selectionBackground = cellBackgroundAt(theme.bg("customMessageBg", "x"), 0);
        const selectedText = stripTerminalSequences(selected);

        expect(visibleWidth(selected)).toBe(21);
        expect(selectedText).toBe("→ primary description");
        expect(cellBackgroundAt(selected, 0)).toBe(selectionBackground);
        expect(cellBackgroundAt(selected, selectedText.length - 1)).toBe(selectionBackground);
        expect(cellStyle(selected, "p")).toEqual(cellStyle(theme.fg("accent", "p"), "p"));
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

import { getSettingsListTheme, initTheme } from "@earendil-works/pi-coding-agent";
import { SettingsList } from "@earendil-works/pi-tui";
import { describe, expect, it } from "vitest";
import {
  renderListRow,
  valueColumnFor,
  type ListViewRow,
  type UiTheme,
} from "../../../src/ui/components/index.js";
import { applyPiTheme, piTheme } from "../../../src/integrations/pi/components/index.js";
import { assertIndependentRawTerminalParity } from "./pi-raw-terminal-parity.js";
import {
  PI_PARITY_COLOR_MODES,
  withPiParityColorMode,
  type PiParityColorMode,
} from "../../support/pi-terminal-capabilities.js";

const rows: readonly ListViewRow[] = [
  { key: "alpha", label: "Auto-compact", value: "true" },
  { key: "beta", label: "Thinking level", value: "medium" },
];

function ownedTheme(): UiTheme {
  return {
    fg: (token, text) => piTheme().fg(token, text),
    bold: text => piTheme().bold(text),
    plain: text => text,
    highlight: text => piTheme().fg("accent", text),
    disabled: text => `\u001b[2m${piTheme().fg("dim", text)}\u001b[22m`,
    panel: text => text,
  };
}

function pinnedRows(width: number): readonly string[] {
  initTheme("dark", false);
  return new SettingsList([
    { id: "alpha", label: "Auto-compact", description: "Automatically compact context", currentValue: "true", values: ["true", "false"] },
    { id: "beta", label: "Thinking level", description: "Reasoning depth", currentValue: "medium", values: ["low", "medium", "high"] },
  ], 10, getSettingsListTheme(), () => {}, () => {}).render(width);
}

function ownedRows(width: number, mode: PiParityColorMode): readonly string[] {
  applyPiTheme("dark", false, mode);
  const valueColumn = valueColumnFor(rows);
  return rows.map((row, index) => renderListRow(row, {
    selected: index === 0,
    hovered: false,
    region: "label",
  }, valueColumn, width, ownedTheme()));
}

describe("owned settings pinned presentation parity", () => {
  it.each(PI_PARITY_COLOR_MODES.flatMap(mode => [28, 40, 72].map(width => [mode, width] as const)))(
    "matches pinned selected/unselected %s rows at %i columns",
    (mode, width) => withPiParityColorMode(mode, () => {
      const expected = pinnedRows(width).slice(0, 2);
      const actual = ownedRows(width, mode);
      expect(actual).toEqual(expected);
      expect(() => assertIndependentRawTerminalParity(
        { producer: "pinned-pi-0.84.2", surface: "settings-rows", width, rows: expected },
        { producer: "owned-product", surface: "settings-rows", width, rows: actual },
      )).not.toThrow();
    }),
  );

  it.each(PI_PARITY_COLOR_MODES)("limits %s parity to the retained row and value presentation", mode => {
    withPiParityColorMode(mode, () => {
      const pinned = pinnedRows(72);
      const owned = ownedRows(72, mode);
      expect(owned).toEqual(pinned.slice(0, owned.length));
      expect(pinned.length).toBeGreaterThan(owned.length);
    });
  });
});

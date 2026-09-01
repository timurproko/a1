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

function ownedRows(width: number): readonly string[] {
  applyPiTheme("dark", false, "truecolor");
  const valueColumn = valueColumnFor(rows);
  return rows.map((row, index) => renderListRow(row, {
    selected: index === 0,
    hovered: false,
    region: "label",
  }, valueColumn, width, ownedTheme()));
}

describe("owned settings pinned presentation parity", () => {
  it.each([28, 40, 72])("matches pinned selected/unselected row ANSI and geometry at %i columns", width => {
    const expected = pinnedRows(width).slice(0, 2);
    const actual = ownedRows(width);
    expect(actual).toEqual(expected);
    expect(() => assertIndependentRawTerminalParity(
      { producer: "pinned-pi-0.84.2", surface: "settings-rows", width, rows: expected },
      { producer: "owned-product", surface: "settings-rows", width, rows: actual },
    )).not.toThrow();
  });

  it("limits pinned parity to the retained row and value presentation", () => {
    const pinned = pinnedRows(72);
    const owned = ownedRows(72);
    expect(owned).toEqual(pinned.slice(0, owned.length));
    expect(pinned.length).toBeGreaterThan(owned.length);
  });
});

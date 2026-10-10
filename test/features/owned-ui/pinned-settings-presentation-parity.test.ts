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
    highlight: text => piTheme().bg("selectedBg", text),
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

function ownedRows(width: number, mode: PiParityColorMode, theme: UiTheme = ownedTheme()): readonly string[] {
  applyPiTheme("dark", false, mode);
  const valueColumn = valueColumnFor(rows);
  return rows.map((row, index) => renderListRow(row, {
    selected: index === 0,
    hovered: false,
    region: "label",
  }, valueColumn, width, theme));
}

/** Reconstruct pinned foreground-only selection to isolate retained row geometry. */
function pinnedCompatibilityTheme(): UiTheme {
  const base = ownedTheme();
  return {
    ...base,
    fg: (token, text) => base.fg(token === "muted" || token === "text" ? "accent" : token, text),
    highlight: text => text,
  };
}

describe("owned settings pinned presentation parity", () => {
  it.each(PI_PARITY_COLOR_MODES.flatMap(mode => [28, 40, 72].map(width => [mode, width] as const)))(
    "matches pinned %s row geometry at %i columns except the declared selected palette",
    (mode, width) => withPiParityColorMode(mode, () => {
      const expected = pinnedRows(width).slice(0, 2);
      const actual = ownedRows(width, mode);
      const pinnedCompatible = [ownedRows(width, mode, pinnedCompatibilityTheme())[0]!, actual[1]!];
      // Invariant: the unselected row retains pinned parity; removing the owned background and
      // mapping its text/value roles to accent reconstructs pinned selected-row bytes.
      expect(actual[1]).toEqual(expected[1]);
      expect(pinnedCompatible).toEqual(expected);
      expect(() => assertIndependentRawTerminalParity(
        { producer: "pinned-pi-0.84.2", surface: "settings-rows", width, rows: expected },
        { producer: "owned-product", surface: "settings-rows", width, rows: pinnedCompatible },
      )).not.toThrow();
      // Rationale: pin the declared palette difference so parity cannot erase the owned surface.
      const theme = ownedTheme();
      const textStart = theme.fg("text", "MARK").split("MARK")[0]!;
      const accentStart = theme.fg("accent", "MARK").split("MARK")[0]!;
      expect(actual[0]).toContain(`${textStart}${rows[0]!.label}`);
      expect(actual[0]).toContain(theme.fg("muted", rows[0]!.value));
      expect(actual[0]).not.toContain(`${accentStart}${rows[0]!.label}`);
      expect(actual[0]).not.toContain(theme.fg("accent", rows[0]!.value));
      expect(actual[0]).toContain(theme.highlight("MARK").split("MARK")[0]);
      expect(expected[0]).toContain(theme.fg("accent", rows[0]!.value));
      expect(actual[0]).not.toEqual(expected[0]);
    }),
  );

  it.each(PI_PARITY_COLOR_MODES)("limits %s parity to the retained row and value presentation", mode => {
    withPiParityColorMode(mode, () => {
      const pinned = pinnedRows(72);
      const owned = [ownedRows(72, mode, pinnedCompatibilityTheme())[0]!, ...ownedRows(72, mode).slice(1)];
      expect(owned).toEqual(pinned.slice(0, owned.length));
      expect(pinned.length).toBeGreaterThan(owned.length);
    });
  });
});

import { describe, expect, it } from "vitest";
import { renderListRow, type ListViewRow, type UiTheme, type UiThemeToken } from "../../../src/ui/components/index.js";

/** Names every token it is asked for, so a row says which colour it chose. */
const NAMING_THEME: UiTheme = Object.freeze({
  fg: (token: UiThemeToken, text: string) => `<${token}>${text}</${token}>`,
  bold: (text: string) => text,
  plain: (text: string) => text,
  highlight: (text: string) => `<highlight>${text}</highlight>`,
  disabled: (text: string) => `<disabled>${text}</disabled>`,
  panel: (text: string) => `<panel>${text}</panel>`,
});

const row: ListViewRow = { key: "theme", label: "Theme", value: "light" };

function render(state: { selected: boolean; hovered: boolean; region: "label" | "value" | "minus" | "plus" }): string {
  return renderListRow(row, state, 24, 80, NAMING_THEME);
}

describe("list rows against the reader's terminal", () => {
  // Compatibility: a theme built for a light background writes near-black text; painting rows
  // with it puts a settings list out of reach in a dark terminal, so unselected
  // rows stay the terminal's own foreground, as the engine's lists do.
  it("leaves an unselected label unpainted", () => {
    const line = render({ selected: false, hovered: false, region: "label" });

    expect(line).toContain("Theme");
    expect(line).not.toContain("<text>Theme");
    expect(line).not.toContain("<muted>Theme");
  });

  it("carries the selection on the cursor and label only", () => {
    const line = render({ selected: true, hovered: false, region: "label" });

    expect(line).toContain("<accent>→ </accent>");
    expect(line).toContain("<accent>Theme");
    expect(line).toContain("<muted>light</muted>");
    expect(line).not.toContain("<accent>light");
  });

  // Rationale: the selected value once regressed to the accent through pinned-row parity;
  // this pins that selection never changes how a value is painted.
  it("paints a selected value exactly like an unselected one, at rest and under the pointer", () => {
    const unselectedRest = render({ selected: false, hovered: false, region: "label" });
    const selectedRest = render({ selected: true, hovered: false, region: "label" });
    const unselectedPointed = render({ selected: false, hovered: true, region: "value" });
    const selectedPointed = render({ selected: true, hovered: true, region: "value" });

    const valueOf = (line: string) => line.trimEnd().match(/S+$/)?.[0];
    expect(valueOf(selectedRest)).toBe(valueOf(unselectedRest));
    expect(valueOf(selectedPointed)).toBe(valueOf(unselectedPointed));
    expect(selectedPointed).toContain("<accent>Theme");
    expect(selectedPointed).not.toContain("<muted>light");
    expect(selectedPointed).not.toContain("<accent>light");
  });

  it("brightens a pointed-at value to the terminal's own foreground", () => {
    const quiet = render({ selected: false, hovered: false, region: "label" });
    const pointed = render({ selected: false, hovered: true, region: "value" });

    expect(quiet).toContain("<muted>light</muted>");
    expect(pointed).toContain("light");
    expect(pointed).not.toContain("<muted>light");
    expect(pointed).not.toContain("<text>light");
  });
});

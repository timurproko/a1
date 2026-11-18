import { describe, expect, it } from "vitest";
import { renderGroupHeader, renderListRow, type ListViewRow, type UiTheme, type UiThemeToken } from "../../../src/ui/components/index.js";

/** Names every token it is asked for, so a row says which colour it chose. */
const NAMING_THEME: UiTheme = Object.freeze({
  fg: (token: UiThemeToken, text: string) => `<${token}>${text}</${token}>`,
  bold: (text: string) => `<b>${text}</b>`,
  plain: (text: string) => text,
  highlight: (text: string) => `<highlight>${text}</highlight>`,
  disabled: (text: string) => `<disabled>${text}</disabled>`,
  panel: (text: string) => `<panel>${text}</panel>`,
  background: (_token: string, text: string) => text,
});

const row: ListViewRow = { key: "theme", label: "Theme", value: "light" };

function render(state: { selected: boolean; hovered: boolean; region: "label" | "value" | "minus" | "plus" }): string {
  return renderListRow(row, state, 24, 80, NAMING_THEME);
}

describe("list rows against the reader's terminal", () => {
  it.each([false, true])("tints the hovered semantic span without moving the keyboard background (selected %s)", selected => {
    const theme = { ...NAMING_THEME, hover: (token: UiThemeToken, text: string) => `~${token}:${text}~` };
    const rest = renderListRow(row, { selected, hovered: false, region: "value" }, 24, 200, theme);
    const value = renderListRow(row, { selected, hovered: true, region: "value" }, 24, 200, theme);
    expect(value).toContain("~muted:light~");
    expect(value.includes("<highlight>")).toBe(rest.includes("<highlight>"));
    expect(value).not.toContain("~text:Theme");
    const label = renderListRow(row, { selected, hovered: true, region: "label" }, 24, 200, theme);
    expect(label).toContain("~text:Theme");
    expect(label).toContain("<muted>light</muted>");
    expect(label.includes("<highlight>")).toBe(rest.includes("<highlight>"));
  });

  it("uses the same blend for enabled stepper controls without changing disabled controls or the value", () => {
    const theme = { ...NAMING_THEME, hover: (token: UiThemeToken, text: string) => `~${token}:${text}~` };
    const number = { key: "number", label: "Count", value: "6", stepper: { lower: true, raise: false } };
    const minus = renderListRow(number, { selected: false, hovered: true, region: "minus" }, 24, 200, theme);
    expect(minus).toContain("~dim:- ~");
    expect(minus).toContain("<muted>6</muted>");
    expect(minus).toContain("<disabled> +</disabled>");
    const disabled = renderListRow(number, { selected: false, hovered: true, region: "plus" }, 24, 200, theme);
    expect(disabled).not.toContain("~dim:");
    expect(disabled).toContain("<disabled> +</disabled>");
  });

  it("renders a group name as a bold Markdown heading", () => {
    expect(renderGroupHeader("Generic", 80, NAMING_THEME)).toBe(" <mdHeading><b>Generic</b></mdHeading>");
  });

  // Compatibility: a theme built for a light background writes near-black text; painting rows
  // with it puts a settings list out of reach in a dark terminal, so unselected
  // rows stay the terminal's own foreground, as the engine's lists do.
  it("leaves an unselected label unpainted", () => {
    const line = render({ selected: false, hovered: false, region: "label" });

    expect(line).toContain("Theme");
    expect(line).not.toContain("<text>Theme");
    expect(line).not.toContain("<muted>Theme");
  });

  it("carries selection with an accent cursor, text label, and item-bounded surface", () => {
    const line = render({ selected: true, hovered: false, region: "label" });

    expect(line).toMatch(/^<highlight>.*<\/highlight>$/u);
    expect(line).toContain("<accent>→ </accent>");
    expect(line).toContain("<text>Theme");
    expect(line).toContain("<muted>light</muted>");
    expect(line).not.toContain("<accent>Theme");
    expect(line).not.toContain("<accent>light");
  });

  // Rationale: selection changes the row surface but never the value's semantic foreground.
  it("paints a selected value exactly like an unselected one, at rest and under the pointer", () => {
    const unselectedRest = render({ selected: false, hovered: false, region: "label" });
    const selectedRest = render({ selected: true, hovered: false, region: "label" });
    const unselectedPointed = render({ selected: false, hovered: true, region: "value" });
    const selectedPointed = render({ selected: true, hovered: true, region: "value" });

    const valueOf = (line: string) => line.trimEnd().match(/S+$/)?.[0];
    expect(valueOf(selectedRest)).toBe(valueOf(unselectedRest));
    expect(valueOf(selectedPointed)).toBe(valueOf(unselectedPointed));
    expect(selectedPointed).toContain("<text>Theme");
    expect(selectedPointed).toMatch(/^<highlight>.*<\/highlight>$/u);
    expect(selectedPointed).toContain("<muted>light</muted>");
    expect(selectedPointed).not.toContain("<accent>light");
  });

  it("keeps the ordinary foreground when a theme has no hover painter", () => {
    const quiet = render({ selected: false, hovered: false, region: "label" });
    const pointed = render({ selected: false, hovered: true, region: "value" });

    expect(quiet).toContain("<muted>light</muted>");
    expect(pointed).toContain("light");
    expect(pointed).toContain("<muted>light</muted>");
    expect(pointed).not.toContain("<text>light");
  });
});

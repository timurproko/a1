import { describe, expect, it } from "vitest";
import { renderDialogPanel, type UiTheme } from "../../../src/ui/components/index.js";

const PLAIN_THEME: UiTheme = {
  fg: (_token, text) => text,
  bold: text => text,
  plain: text => text,
  highlight: text => text,
  disabled: text => text,
  panel: text => text,
};

const NAMING_THEME: UiTheme = {
  ...PLAIN_THEME,
  fg: (token, text) => `<${token}>${text}</${token}>`,
  highlight: text => `<highlight>${text}</highlight>`,
};

describe("shared dialog panel", () => {
  it("keeps rules full width and gives every semantic content row the global left cell", () => {
    const rows = renderDialogPanel({
      rows: [
        { label: "Alpha", value: "one", description: "selected description" },
        { label: "Beta", value: "two" },
      ],
      index: 0,
      hint: [{ key: "↑↓", action: "navigate" }],
    }, 32, PLAIN_THEME);

    expect(rows[0]).toBe("─".repeat(32));
    expect(rows.at(-1)).toBe("─".repeat(32));
    expect(rows[1]?.trimEnd()).toBe(" → Alpha  one");
    expect(rows[2]?.trimEnd()).toBe("   Beta   two");
    expect(rows[4]?.trimEnd()).toBe("   selected description");
    expect(rows[6]?.trimEnd()).toBe(" ↑↓ navigate");
    for (const row of rows.slice(1, -1).filter(row => row.trim().length > 0)) expect(row.startsWith(" ")).toBe(true);
  });

  it("uses the shared item-bounded selection roles for a structured setting", () => {
    const rows = renderDialogPanel({
      rows: [{ label: "Alpha", value: "one" }, { label: "Beta", value: "two" }],
      index: 0,
      hint: "change",
    }, 200, NAMING_THEME);

    expect(rows[1]).toContain("<highlight><accent>→ </accent><text>Alpha</text>  <muted>one</muted></highlight>");
    expect(rows[1]).toMatch(/<\/highlight>\s+$/u);
    expect(rows[2]).not.toContain("<highlight>");
  });
});

import { describe, expect, it } from "vitest";
import { LineInput, renderDialogPanel, renderSteppedDialogPanel, type UiTheme } from "../../../src/ui/components/index.js";

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
      title: "Warnings",
      rows: [
        { label: "Alpha", value: "one", description: "selected description" },
        { label: "Beta", value: "two" },
      ],
      index: 0,
      hint: [{ key: "↑↓", action: "navigate" }],
    }, 32, PLAIN_THEME);

    expect(rows[0]).toBe("─".repeat(32));
    expect(rows.at(-1)).toBe("─".repeat(32));
    expect(rows[1]?.trimEnd()).toBe(" Warnings");
    expect(rows[2]?.trimEnd()).toBe(" selected description");
    expect(rows[4]?.trimEnd()).toBe(" → Alpha  one");
    expect(rows[5]?.trimEnd()).toBe("   Beta   two");
    expect(rows[7]?.trimEnd()).toBe(" ↑↓ navigate");
    for (const row of rows.slice(1, -1).filter(row => row.trim().length > 0)) expect(row.startsWith(" ")).toBe(true);
  });

  it("renders a stepped selector with one upper rule, title, instruction, search, hint, and bottom rule", () => {
    const rows = renderSteppedDialogPanel({
      title: "Thinking Level",
      step: 1,
      steps: 2,
      description: "Select a model to configure",
      input: new LineInput("spark"),
      rows: [{ label: "gpt-5.3-codex-spark [openai]", value: "low" }],
      index: 0,
      hint: [
        { key: "Type", action: "search" },
        { key: "Enter", action: "select" },
        { key: "esc", action: "close" },
      ],
    }, 80, PLAIN_THEME);

    expect(rows[0]).toBe("─".repeat(80));
    expect(rows.at(-1)).toBe("─".repeat(80));
    expect(rows.filter(row => row === "─".repeat(80))).toHaveLength(2);
    expect(rows.join("\n")).toContain("Thinking Level (step 1/2)");
    expect(rows.join("\n")).toContain("> spark");
    expect(rows.join("\n")).not.toContain("❯ spark");
    expect(rows.join("\n")).toContain("Select a model to configure");
    expect(rows.join("\n")).toContain("Type search · Enter select · Esc close");
  });

  it("mutes a stepped model row's bracketed provider, including on the selected row", () => {
    const rows = renderSteppedDialogPanel({
      title: "Thinking Level",
      step: 1,
      steps: 2,
      description: "Select a model to configure",
      rows: [{ label: "gpt-5.3-codex-spark", labelSuffix: " [openai-codex]", value: "" }],
      index: 0,
      hint: [{ key: "esc", action: "close" }],
    }, 100, NAMING_THEME);

    expect(rows[1]).toContain("<accent>Thinking Level</accent> <dim>(step 1/2)</dim>");
    expect(rows[2]).toContain("<dim>Select a model to configure</dim>");
    expect(rows.join("\n")).toContain("<text>gpt-5.3-codex-spark</text><muted> [openai-codex]</muted>");
  });

  it("uses the shared item-bounded selection roles for a structured setting", () => {
    const rows = renderDialogPanel({
      title: "Warnings",
      rows: [{ label: "Alpha", value: "one", description: "Warn when alpha applies" }, { label: "Beta", value: "two" }],
      index: 0,
      hint: "change",
    }, 200, NAMING_THEME);

    expect(rows[1]).toContain("<accent>Warnings</accent>");
    expect(rows[2]).toContain("<dim>Warn when alpha applies</dim>");
    expect(rows[4]).toContain("<highlight><accent>→ </accent><text>Alpha</text>  <muted>one</muted></highlight>");
    expect(rows[4]).toMatch(/<\/highlight>\s+$/u);
    expect(rows[5]).not.toContain("<highlight>");
  });
});

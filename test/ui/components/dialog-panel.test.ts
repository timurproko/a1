import { describe, expect, it } from "vitest";
import { renderFloatingDialogSurface, renderFloatingMenuSurface } from "../../../src/ui/components/dialog-panel.js";
import {
  LineInput,
  configureDialogWidth,
  displayWidth,
  renderCenteredDialogOverlay,
  renderDialogPanel,
  renderSteppedDialogPanel,
  stripAnsi,
  type UiTheme,
} from "../../../src/ui/components/index.js";

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
  it("fills the compact modal width and gives every semantic row the shared inset", () => {
    const rows = renderDialogPanel({
      title: "Warnings",
      rows: [
        { label: "Alpha", value: "one", description: "selected description" },
        { label: "Beta", value: "two" },
      ],
      index: 0,
      hint: [{ key: "↑↓", action: "navigate" }],
    }, 32, PLAIN_THEME);

    expect(rows[0]).toBe(" ".repeat(32));
    expect(rows.at(-1)).toBe(" ".repeat(32));
    expect(rows[1]?.trimEnd()).toBe("  Warnings");
    expect(rows[2]?.trimEnd()).toBe("  selected description");
    expect(rows[4]?.trimEnd()).toBe("  → Alpha  one");
    expect(rows[5]?.trimEnd()).toBe("    Beta   two");
    expect(rows[7]?.trimEnd()).toBe("  ↑↓ navigate");
    for (const row of rows) expect(stripAnsi(row)).toHaveLength(32);
  });

  it("renders a stepped selector with modal padding, title, instruction, search, and hint", () => {
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

    expect(rows[0]).toBe(" ".repeat(80));
    expect(rows.at(-1)).toBe(" ".repeat(80));
    expect(rows.join("\n")).toContain("Thinking Level (step 1/2)");
    expect(rows.some(row => stripAnsi(row).trimEnd() === "  > spark")).toBe(true);
    expect(rows.join("\n")).toContain("> spark");
    expect(rows.join("\n")).not.toContain("❯ spark");
    expect(rows.join("\n")).toContain("Select a model to configure");
    expect(rows.join("\n")).toContain("Type search  Enter select  Esc close");
    expect(rows.join("\n")).not.toContain(" · ");
    expect(stripAnsi(rows[1] ?? "").search(/\S/u)).toBe(2);
    expect(stripAnsi(rows[4] ?? "").indexOf(">" )).toBe(2);
    expect(stripAnsi(rows[6] ?? "").indexOf("→")).toBe(2);
    expect(stripAnsi(rows[8] ?? "").search(/\S/u)).toBe(2);
  });

  it("keeps stepped content aligned and close guidance intact at narrow widths", () => {
    const rows = renderSteppedDialogPanel({
      title: "Thinking Level",
      step: 1,
      steps: 2,
      description: "Select a model to configure",
      input: new LineInput("spark"),
      rows: [{ label: "gpt-5.3-codex-spark", labelSuffix: " [openai-codex]", value: "low" }],
      index: 0,
      hint: [
        { key: "Type", action: "search" },
        { key: "Enter", action: "select" },
        { key: "esc", action: "close" },
      ],
    }, 24, PLAIN_THEME);

    expect(rows[0]).toBe(" ".repeat(24));
    expect(rows.at(-1)).toBe(" ".repeat(24));
    for (const row of rows) {
      expect(stripAnsi(row)).toHaveLength(24);
      expect(stripAnsi(row).startsWith("  ")).toBe(true);
    }
    expect(rows.join("\n")).toContain("Esc close");
    expect(rows.join("\n")).not.toContain(" · ");
  });

  it("dims the backdrop and centers a full-intensity, panel-filled configure surface", () => {
    const panelTheme: UiTheme = {
      ...PLAIN_THEME,
      highlight: text => `\u001b[48;2;58;56;66m${text}\u001b[49m`,
      panel: text => renderFloatingDialogSurface(text, "truecolor"),
    };
    const width = 80;
    const dialog = renderDialogPanel({
      title: "Warnings",
      rows: [{ label: "Alpha", value: "true", description: "Warn when alpha applies" }],
      index: 0,
      hint: [{ key: "esc", action: "close" }],
    }, configureDialogWidth(width), panelTheme);
    const rendered = renderCenteredDialogOverlay(
      Array.from({ length: 14 }, (_, index) => index === 1
        ? "\u001b[1mbright\u001b[22m tail"
        : `background ${index}`),
      dialog,
      { width, height: 14 },
      panelTheme,
    );

    expect(rendered).toHaveLength(14);
    expect(rendered.every(row => displayWidth(row) === width)).toBe(true);
    expect(rendered[0]).toContain("\u001b[2mbackground 0");
    expect(rendered[1]).toContain("\u001b[1m\u001b[2mbright\u001b[22m\u001b[2m tail");
    const title = rendered.find(row => stripAnsi(row).includes("Warnings")) ?? "";
    expect(title).toContain("\u001b[22;39;49m\u001b[48;2;38;38;38m");
    expect(stripAnsi(title).indexOf("Warnings")).toBe(12);
    expect(title.slice(title.indexOf("\u001b[49m") + 5)).toContain("\u001b[2m");
    const selected = rendered.find(row => stripAnsi(row).includes("Alpha")) ?? "";
    expect(selected).toContain("\u001b[49m\u001b[48;2;38;38;38m  ");
    expect(renderFloatingDialogSurface("panel", "256color")).toBe("\u001b[48;5;235mpanel\u001b[49m");
    expect(renderFloatingMenuSurface("panel", "truecolor")).toBe("\u001b[48;2;55;55;55mpanel\u001b[49m");
    expect(renderFloatingMenuSurface("panel", "256color")).toBe("\u001b[48;5;237mpanel\u001b[49m");
  });

  it("mutes a stepped model row's bracketed provider, including on the selected row", () => {
    const rows = renderSteppedDialogPanel({
      title: "Thinking Level",
      step: 1,
      steps: 2,
      description: "Select a model to configure",
      input: new LineInput(""),
      rows: [{ label: "gpt-5.3-codex-spark", labelSuffix: " [openai-codex]", value: "" }],
      index: 0,
      hint: [{ key: "esc", action: "close" }],
    }, 100, NAMING_THEME);

    expect(rows[1]).toContain("<accent>Thinking Level</accent> <dim>(step 1/2)</dim>");
    expect(rows[2]).toContain("<dim>Select a model to configure</dim>");
    expect(rows.some(row => row.includes("<accent>></accent> "))).toBe(true);
    expect(rows.join("\n")).toContain("<text>gpt-5.3-codex-spark</text><muted> [openai-codex]</muted>");
  });

  it("uses the shared full-content selection roles for a structured setting", () => {
    const rows = renderDialogPanel({
      title: "Warnings",
      rows: [{ label: "Alpha", value: "one", description: "Warn when alpha applies" }, { label: "Beta", value: "two" }],
      index: 0,
      hint: "change",
    }, 200, NAMING_THEME);

    expect(rows[1]).toContain("<accent>Warnings</accent>");
    expect(rows[2]).toContain("<dim>Warn when alpha applies</dim>");
    expect(rows[4]).toContain("<highlight><accent>→ </accent><text>Alpha</text>  <muted>one</muted>");
    expect(rows[4]).toMatch(/<\/muted>\s+<\/highlight>\s+$/u);
    expect(rows[5]).not.toContain("<highlight>");
  });
});

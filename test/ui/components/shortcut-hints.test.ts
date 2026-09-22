import { describe, expect, it } from "vitest";
import { renderShortcutHints } from "../../../src/ui/components/index.js";
import { displayWidth, stripAnsi, truncateToWidth } from "../../../src/ui/components/text.js";

const theme = {
  fg: (token: string, text: string) => `\u001b[${token === "dim" ? "2" : "22"}m${text}\u001b[0m`,
};

describe("modal shortcut hints", () => {
  it("uses separate key and action roles with whitespace-only entry gaps", () => {
    const rendered = renderShortcutHints([
      { key: "↑↓", action: "navigate" },
      { key: "enter", action: "select" },
      { key: "escape", action: "cancel" },
    ], theme, 2);
    expect(rendered).toBe("  \u001b[2m↑↓\u001b[0m \u001b[22mnavigate\u001b[0m  \u001b[2menter\u001b[0m \u001b[22mselect\u001b[0m  \u001b[2mescape\u001b[0m \u001b[22mcancel\u001b[0m");
    expect(stripAnsi(rendered)).toBe("  ↑↓ navigate  enter select  escape cancel");
    expect(rendered).not.toMatch(/[·•]/u);
  });

  it("keeps keyless prose, omits unbound entries, and preserves content punctuation", () => {
    const rendered = renderShortcutHints([
      { action: "type to search" },
      { key: "", action: "save" },
      { key: "ctrl+p", action: "open (current/default)" },
      { key: "1/2/3", action: "filters", actionFirst: true },
    ], theme);
    expect(stripAnsi(rendered)).toBe("type to search  ctrl+p open (current/default)  filters 1/2/3");
    expect(stripAnsi(rendered)).not.toContain("save");
  });

  it("remains ANSI-safe when a caller truncates it to a narrow modal width", () => {
    const rendered = renderShortcutHints([
      { key: "enter", action: "select" },
      { key: "escape", action: "cancel" },
    ], theme, 2);
    const clipped = truncateToWidth(rendered, 16);
    expect(displayWidth(clipped)).toBeLessThanOrEqual(16);
    expect(clipped.endsWith("\u001b[0m")).toBe(true);
  });
});

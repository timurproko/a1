import { describe, expect, it } from "vitest";
import { DIALOG_CLOSE_SHORTCUT_HINT } from "../../../src/contracts/presentation/index.js";
import { renderShortcutHints, renderShortcutHintsWithClose } from "../../../src/ui/components/index.js";
import { displayWidth, stripAnsi, truncateToWidth } from "../../../src/ui/components/text.js";

const theme = {
  fg: (token: string, text: string) => `\u001b[${token === "dim" ? "2" : "22"}m${text}\u001b[0m`,
};

describe("modal shortcut hints", () => {
  it("renders the canonical dialog close entry as Esc close", () => {
    expect(DIALOG_CLOSE_SHORTCUT_HINT).toEqual({ key: "esc", action: "close" });
    expect(stripAnsi(renderShortcutHints([DIALOG_CLOSE_SHORTCUT_HINT], theme))).toBe("Esc close");
  });

  it("clips preceding entries before a final canonical close entry", () => {
    const rendered = renderShortcutHintsWithClose([
      { key: "enter", action: "select" },
      DIALOG_CLOSE_SHORTCUT_HINT,
    ], theme, 12, 1);
    expect(stripAnsi(rendered)).toBe("Esc close");
    expect(displayWidth(rendered)).toBe(9);
  });

  it("uses separate key and action roles with whitespace-only entry gaps", () => {
    const rendered = renderShortcutHints([
      { key: "↑↓", action: "navigate" },
      { key: "enter", action: "select" },
      { key: "escape", action: "cancel" },
    ], theme, 2);
    expect(rendered).toBe("  \u001b[2m↑↓\u001b[0m \u001b[22mnavigate\u001b[0m  \u001b[2mEnter\u001b[0m \u001b[22mselect\u001b[0m  \u001b[2mEscape\u001b[0m \u001b[22mcancel\u001b[0m");
    expect(stripAnsi(rendered)).toBe("  ↑↓ navigate  Enter select  Escape cancel");
    expect(rendered).not.toMatch(/[·•]/u);
  });

  it("applies the same key/action roles when a dialog requests compact separators", () => {
    const rendered = renderShortcutHints([
      { key: "Type", action: "search" },
      { key: "enter", action: "select" },
      { key: "esc", action: "back" },
    ], theme, 1, " · ");
    expect(rendered).toBe(" \u001b[2mType\u001b[0m \u001b[22msearch\u001b[0m · \u001b[2mEnter\u001b[0m \u001b[22mselect\u001b[0m · \u001b[2mEsc\u001b[0m \u001b[22mback\u001b[0m");
    expect(stripAnsi(rendered)).toBe(" Type search · Enter select · Esc back");
  });

  it("rejects inconsistent keyed labels for every owned-dialog caller", () => {
    expect(() => renderShortcutHints([{ key: "esc", action: "to close" }], theme)).toThrow(/omit connective "to"/u);
    expect(() => renderShortcutHints([{ key: "esc", action: " close" }], theme)).toThrow(/surrounding whitespace/u);
    expect(() => renderShortcutHints([{ key: "esc", action: "" }], theme)).toThrow(/nonempty/u);
    expect(() => renderShortcutHints([{ key: " esc", action: "close" }], theme)).toThrow(/keys must not/u);
  });

  it("keeps keyless prose, omits unbound entries, and preserves content punctuation", () => {
    const rendered = renderShortcutHints([
      { action: "start typing" },
      { key: "", action: "save" },
      { key: "ctrl+p/alt+up", action: "open (current/default)" },
      { key: "1/2/3", action: "filters", actionFirst: true },
    ], theme);
    expect(stripAnsi(rendered)).toBe("start typing  Ctrl+P/Alt+Up open (current/default)  filters 1/2/3");
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

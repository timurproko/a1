import { ExtensionSelectorComponent } from "@earendil-works/pi-coding-agent";
import { stripTerminalSequences } from "@earendil-works/pi-tui";
import { describe, expect, it, vi } from "vitest";
import { createPiShellSkillsSelector } from "../../../../src/integrations/pi/components/index.js";
import { ensureTheme } from "../../../../src/integrations/pi/components/shell-shared-facade.js";
import { piTheme } from "../../../../src/integrations/pi/components/theme.js";
import { firstVisibleTextColumn } from "../../../support/dialog-alignment.js";

const ESC = "\u001b";
const ENTER = "\r";
const UP = "\u001b[A";
const DOWN = "\u001b[B";
const BACKSPACE = "\u007f";

const SKILLS = [
  { name: "framer", description: "Design, edit, and publish Framer sites" },
  { name: "code-review", description: "Review the current diff" },
  { name: "apply-patch", description: "" },
];

/** Replace theme colors with role tags so a snapshot reads as roles, not RGB. */
function semantic(rows: readonly string[]): string[] {
  ensureTheme();
  const roles: Array<[string, string]> = ["accent", "muted", "dim", "border", "borderMuted", "text", "warning"].map(role => {
    const start = piTheme().fg(role as never, "MARK").split("MARK")[0]!;
    return [start, `<${role}>`];
  });
  const bold = piTheme().bold("MARK").split("MARK");
  return rows.map(row => {
    let out = row;
    for (const [start, tag] of roles) out = out.split(start).join(tag);
    if (bold[0]) out = out.split(bold[0]).join("<b>");
    if (bold[1]) out = out.split(bold[1]).join("</b>");
    return out.replaceAll("\u001b[39m", "</>").replace(/\s+$/u, "");
  });
}

function dialog(skills = SKILLS) {
  const onSelect = vi.fn<(name: string) => void>();
  const onCancel = vi.fn();
  const component = createPiShellSkillsSelector({ skills, onSelect, onCancel });
  component.setFocused?.(true);
  const plain = (width: number) => component.render(width).map(row => stripTerminalSequences(row).replace(/\s+$/u, ""));
  return { component, onSelect, onCancel, plain, type: (text: string) => { for (const char of text) component.handleInput?.(char); } };
}

describe("the Skills dialog", () => {
  it("renders the model-selector composition with v2 content at narrow and wide widths", () => {
    const { component, plain } = dialog();
    expect(plain(80)).toEqual([
      "─".repeat(80),
      " Skills",
      "",
      " >",
      "",
      " → skill:framer",
      "   skill:code-review",
      "   skill:apply-patch",
      "",
      "   Design, edit, and publish Framer sites",
      "",
      " ↑↓ navigate  Enter select  Escape/Ctrl+C cancel",
      "─".repeat(80),
    ]);
    expect(plain(40)).toEqual([
      "─".repeat(40),
      " Skills",
      "",
      " >",
      "",
      " → skill:framer",
      "   skill:code-review",
      "   skill:apply-patch",
      "",
      "   Design, edit, and publish Framer site",
      "",
      // Invariant: the shared frame gives wrapped content one cell less than its full-width rules.
      " ↑↓ navigate  Enter select",
      " Escape/Ctrl+C cancel",
      "─".repeat(40),
    ]);
    const rendered = component.render(80);
    const rows = semantic(rendered);
    const heading = rendered.find(row => stripTerminalSequences(row).includes("Skills"))!;
    const hint = rendered.find(row => stripTerminalSequences(row).includes("↑↓ navigate"))!;
    expect(firstVisibleTextColumn(hint)).toBe(firstVisibleTextColumn(heading));
    // Platform: chalk decides whether bold is emitted for this terminal; the accent role is what the theme guarantees.
    expect(rows[1]).toMatch(/^ <accent>(?:<b>)?Skills(?:<\/b>)?<\/>$/u);
    expect(rows[5]).toBe(" <accent>→ </><accent>skill:framer</>");
    expect(rows[6]).toBe("   skill:code-review");
    expect(rows[9]).toBe(" <muted>  Design, edit, and publish Framer sites</>");
  });

  it("uses the pinned selectors' keybinding-hint footer wording", () => {
    const { component } = dialog();
    const pinned = new ExtensionSelectorComponent("Pinned", ["one"], () => {}, () => {}).render(80)
      .map(row => stripTerminalSequences(row).trim()).find(row => row.includes("navigate"));
    const footer = component.render(80).map(row => stripTerminalSequences(row).trim()).find(row => row.includes("navigate"));
    expect(footer?.toLowerCase()).toBe(pinned);
    expect(footer).toBe("↑↓ navigate  Enter select  Escape/Ctrl+C cancel");
  });

  it("wraps the selection, shows the selected description, and applies with Enter", () => {
    const { component, onSelect, onCancel, plain } = dialog();
    component.handleInput?.(UP);
    // Invariant: a skill without a description shows no description block.
    expect(plain(80).slice(5, 10)).toEqual(["   skill:framer", "   skill:code-review", " → skill:apply-patch", "", " ↑↓ navigate  Enter select  Escape/Ctrl+C cancel"]);
    component.handleInput?.(DOWN);
    expect(plain(80).slice(5, 10)).toEqual([" → skill:framer", "   skill:code-review", "   skill:apply-patch", "", "   Design, edit, and publish Framer sites"]);
    component.handleInput?.(DOWN);
    expect(plain(80).slice(5, 10)).toEqual(["   skill:framer", " → skill:code-review", "   skill:apply-patch", "", "   Review the current diff"]);
    component.handleInput?.(ENTER);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith("code-review");
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("truncates a long description to one line instead of wrapping", () => {
    const long = "Update an OpenSpec change by revising its existing planning artifacts and keeping them coherent with one another. Never edits code.";
    const { plain } = dialog([{ name: "openspec-update-change", description: long }]);
    const rows = plain(60);
    expect(rows[7]).toBe("   " + long.slice(0, 57));
    expect(rows.slice(8)).toEqual(["", " ↑↓ navigate  Enter select  Escape/Ctrl+C cancel", "─".repeat(60)]);
  });

  it("filters on name or description ignoring case and skill:, resets the selection, and reports no matches", () => {
    const { component, onSelect, plain, type } = dialog();
    component.handleInput?.(DOWN);
    type("SKILL:APP");
    expect(plain(80).slice(3, 8)).toEqual([" > SKILL:APP", "", " → skill:apply-patch", "", " ↑↓ navigate  Enter select  Escape/Ctrl+C cancel"]);
    for (let index = 0; index < "SKILL:APP".length; index++) component.handleInput?.(BACKSPACE);
    type("diff");
    expect(plain(80).slice(5, 8)).toEqual([" → skill:code-review", "", "   Review the current diff"]);
    // Invariant: Enter applies the skill only; the query is never appended as arguments.
    component.handleInput?.(ENTER);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith("code-review");
    for (let index = 0; index < "diff".length; index++) component.handleInput?.(BACKSPACE);
    type("zzz");
    expect(plain(80).slice(3, 7)).toEqual([" > zzz", "", "   No matching skills", ""]);
    component.handleInput?.(ENTER);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(semantic(component.render(80))[5]).toBe(" <muted>  No matching skills</>");
  });

  it("cancels on Escape without selecting", () => {
    const { component, onSelect, onCancel } = dialog();
    component.handleInput?.(ESC);
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("renders No skills yet when nothing is discovered and Enter does nothing", () => {
    const { component, onSelect, plain, type } = dialog([]);
    expect(plain(60).slice(5, 7)).toEqual(["   No skills yet", ""]);
    component.handleInput?.(ENTER);
    component.handleInput?.(DOWN);
    type("fra");
    component.handleInput?.(ENTER);
    expect(onSelect).not.toHaveBeenCalled();
    expect(plain(60)[5]).toBe("   No skills yet");
  });

  it("shows the pinned scroll counter only when the rows overflow the visible window", () => {
    const many = Array.from({ length: 12 }, (_, index) => ({ name: `skill-${String(index).padStart(2, "0")}`, description: `Skill ${index}` }));
    const { component, plain } = dialog(many);
    const initial = plain(80);
    expect(initial.filter(row => row.startsWith("   skill:") || row.startsWith(" → skill:"))).toHaveLength(10);
    expect(initial).toContain("   (1/12)");
    component.handleInput?.(UP);
    const wrapped = plain(80);
    expect(wrapped).toContain(" → skill:skill-11");
    expect(wrapped).toContain("   (12/12)");
    expect(wrapped).toContain("   Skill 11");
    const { plain: few } = dialog(SKILLS);
    expect(few(80).some(row => /\(\d+\/\d+\)/u.test(row))).toBe(false);
  });
});

import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const OWNED_SELECT_LIST_CONSUMERS = [
  "src/integrations/pi/components/shell-editor-autocomplete.ts",
  "src/integrations/pi/components/shell-extension-ui.ts",
  "src/integrations/pi/components/shell-selectors-dialogs.ts",
  "src/integrations/pi/components/upstream/components/extension-editor.ts",
] as const;
const OWNED_DIALOG_BORDER_CONSUMERS = [
  "src/integrations/pi/components/models-dialog.ts",
  "src/integrations/pi/components/shell-presenters-info.ts",
  "src/integrations/pi/components/skills-dialog.ts",
  "src/integrations/pi/components/upstream/components/extension-editor.ts",
  "src/integrations/pi/components/upstream/components/extension-input.ts",
  "src/integrations/pi/components/upstream/components/extension-selector.ts",
  "src/integrations/pi/components/upstream/components/scoped-models-selector.ts",
  "src/integrations/pi/components/upstream/components/session-selector.ts",
  "src/integrations/pi/components/upstream/components/tree-selector.ts",
] as const;
const OWNED_MARKDOWN_CONSUMERS = [
  "src/integrations/pi/components/components.ts",
  "src/integrations/pi/components/shell-presenters-info.ts",
  "src/integrations/pi/components/shell-presenters-transcript.ts",
  "src/integrations/pi/components/submitted-prompt-adapter.ts",
] as const;

describe("semantic accent-family architecture", () => {
  it("keeps owned select lists on the active A1 theme facade", async () => {
    for (const path of OWNED_SELECT_LIST_CONSUMERS) {
      const source = await readFile(path, "utf8");
      expect(source, path).toContain("getPiSelectListTheme");
      expect(source, path).not.toMatch(/\bgetSelectListTheme\b/u);
    }
  });

  it("keeps owned dialog rules on the active A1 theme facade", async () => {
    for (const path of OWNED_DIALOG_BORDER_CONSUMERS) {
      const source = await readFile(path, "utf8");
      expect(source, path).toContain("paintPiBorder");
      expect(source, path).not.toContain("new DynamicBorder()");
    }
  });

  it("keeps owned Markdown and accent-painted hotkeys on active A1 theme facades", async () => {
    for (const path of OWNED_MARKDOWN_CONSUMERS) {
      const source = await readFile(path, "utf8");
      expect(source, path).toContain("getPiMarkdownTheme");
      expect(source, path).not.toMatch(/\bgetMarkdownTheme\b/u);
    }
    const sections = await readFile("src/integrations/pi/components/shell-hotkey-sections.ts", "utf8");
    expect(sections).toContain("getPiHotkeysMarkdownTheme");
    const presenter = await readFile("src/integrations/pi/components/shell-presenters-info.ts", "utf8");
    expect(presenter).toContain("getPiHotkeysMarkdownTheme");
    const theme = await readFile("src/integrations/pi/components/theme.ts", "utf8");
    expect(theme).toContain('code: text => piTheme().fg("mdHeading", text)');
  });

  it("invalidates retained transcript components and keeps filters secondary while state markers match text", async () => {
    const shell = await readFile("src/app/session-shell/session-shell-root.ts", "utf8");
    expect(shell).toContain("this.#themeUnsubscribe = onPiThemeChange(() => {\n      this.invalidate();");
    const sessions = await readFile("src/integrations/pi/components/upstream/components/session-selector.ts", "utf8");
    expect(sessions).toContain('this.scope === "current" ? "mdHeading" : "dim"');
    expect(sessions).toContain('theme.fg("mdHeading", this.nameFilter)');
    expect(sessions).toContain('theme.fg("mdHeading", sortLabel)');
    const models = await readFile("src/integrations/pi/components/models-dialog.ts", "utf8");
    expect(models).toContain('? "mdHeading" : "dim", "all"');
    expect(models).toContain('theme.fg("text", "●")');
    const tree = await readFile("src/integrations/pi/components/upstream/components/tree-selector.ts", "utf8");
    expect(tree).toContain('mode === active ? "mdHeading" : "muted"');
    const thinking = await readFile("src/integrations/pi/components/upstream/components/thinking-selector.ts", "utf8");
    expect(thinking).toContain('theme.fg("text", "◉")');
  });

  it("keeps sticky prompts and jump controls neutral until their accent hover", async () => {
    const source = await readFile("src/app/session-shell/session-shell-root.ts", "utf8");
    expect(source.match(/hovered \? "selectedBg" : "toolPendingBg"/gu)).toHaveLength(2);
  });

  it("projects only the declared semantic family without depending on Pi's current violet representation", async () => {
    const source = await readFile("src/integrations/pi/components/upstream/theme/theme.ts", "utf8");
    expect(source).toContain("accent: tone.accent");
    expect(source).toContain("border: tone.border");
    expect(source).toContain("mdHeading: tone.secondaryHeading");
    expect(source).toContain("mdListBullet: tone.secondaryHeading");
    expect(source).toContain("selectedBg: tone.selectedBg");
    expect(source).toContain("userMessageBg: tone.userMessageBg");
    expect(source).toContain("purple: Object.freeze");
    expect(source).toContain("export function derivePiAccentProjection(accent: Color");
    expect(source).toContain("derivePiAccentProjection(ACCENT_PALETTE[color][base.appearance]");
    const palette = source.slice(source.indexOf("const ACCENT_PALETTE"), source.indexOf("function clamp"));
    expect(palette).not.toMatch(/(?:border|secondaryHeading|selectedBg|userMessageBg):/u);
    expect(source).not.toContain('if (color === "default") return base');
    expect(source).toContain("projectPiAccent(activeBaseTheme, color)");
    expect(source).not.toContain('"violet"');
    expect(source).not.toContain("167;152;215");
  });
});

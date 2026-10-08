import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const OWNED_SELECT_LIST_CONSUMERS = [
  "src/integrations/pi/components/shell-editor-autocomplete.ts",
  "src/integrations/pi/components/shell-extension-ui.ts",
  "src/integrations/pi/components/shell-selectors-dialogs.ts",
  "src/integrations/pi/components/upstream/components/extension-editor.ts",
] as const;
const OWNED_MARKDOWN_CONSUMERS = [
  "src/integrations/pi/components/components.ts",
  "src/integrations/pi/components/shell-hotkey-sections.ts",
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

  it("keeps owned Markdown list markers on the active A1 theme facade", async () => {
    for (const path of OWNED_MARKDOWN_CONSUMERS) {
      const source = await readFile(path, "utf8");
      expect(source, path).toContain("getPiMarkdownTheme");
      expect(source, path).not.toMatch(/\bgetMarkdownTheme\b/u);
    }
  });

  it("keeps sticky prompts and jump controls neutral until their accent hover", async () => {
    const source = await readFile("src/app/session-shell/session-shell-root.ts", "utf8");
    expect(source.match(/hovered \? "selectedBg" : "toolPendingBg"/gu)).toHaveLength(2);
  });

  it("projects only the declared semantic family without depending on Pi's current violet representation", async () => {
    const source = await readFile("src/integrations/pi/components/upstream/theme/theme.ts", "utf8");
    expect(source).toContain("accent: tone.accent");
    expect(source).toContain("border: tone.border");
    expect(source).toContain("mdListBullet: tone.accent");
    expect(source).toContain("selectedBg: tone.selectedBg");
    expect(source).toContain("userMessageBg: tone.userMessageBg");
    expect(source).toContain("purple: Object.freeze");
    expect(source).not.toContain('if (color === "default") return base');
    expect(source).toContain("projectPiAccent(activeBaseTheme, color)");
    expect(source).not.toContain('"violet"');
    expect(source).not.toContain("167;152;215");
  });
});

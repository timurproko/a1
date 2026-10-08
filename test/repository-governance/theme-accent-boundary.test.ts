import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const OWNED_SELECT_LIST_CONSUMERS = [
  "src/integrations/pi/components/shell-editor-autocomplete.ts",
  "src/integrations/pi/components/shell-extension-ui.ts",
  "src/integrations/pi/components/shell-selectors-dialogs.ts",
  "src/integrations/pi/components/upstream/components/extension-editor.ts",
] as const;

describe("semantic accent-family architecture", () => {
  it("keeps owned select lists on the active A1 theme facade", async () => {
    for (const path of OWNED_SELECT_LIST_CONSUMERS) {
      const source = await readFile(path, "utf8");
      expect(source, path).toContain("getPiSelectListTheme");
      expect(source, path).not.toMatch(/\bgetSelectListTheme\b/u);
    }
  });

  it("projects only the declared semantic family without depending on Pi's current violet representation", async () => {
    const source = await readFile("src/integrations/pi/components/upstream/theme/theme.ts", "utf8");
    expect(source).toContain("accent: tone.accent");
    expect(source).toContain("border: tone.border");
    expect(source).toContain("selectedBg: tone.selectedBg");
    expect(source).toContain("userMessageBg: tone.userMessageBg");
    expect(source).toContain('if (color === "default") return base');
    expect(source).toContain("projectPiAccent(activeBaseTheme, color)");
    expect(source).not.toContain('"violet"');
    expect(source).not.toContain("167;152;215");
  });
});

import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const COMPONENT = "src/ui/components/text-selection.ts";
const RECIPIENTS = [
  "src/ui/components/transcript-viewport.ts",
  "src/app/session-shell/session-shell-root.ts",
  "src/app/session-shell/shell-editor-factory.ts",
  "src/composition/settings-search-input.ts",
  "src/features/owned-ui/reference-document-selection.ts",
] as const;
const BLUE_SELECTION = "48;2;38;79;120";

describe("shared text-selection style boundary", () => {
  it("keeps the blue selection palette in one component and routes every recipient through it", async () => {
    const [component, ...recipients] = await Promise.all([
      readFile(COMPONENT, "utf8"),
      ...RECIPIENTS.map(path => readFile(path, "utf8")),
    ]);
    expect(component).toContain(BLUE_SELECTION);
    expect(component.split(BLUE_SELECTION)).toHaveLength(2);
    for (const [index, source] of recipients.entries()) {
      expect(source, RECIPIENTS[index]).toContain("paintTextSelection");
      expect(source, RECIPIENTS[index]).not.toContain(BLUE_SELECTION);
    }
  });
});

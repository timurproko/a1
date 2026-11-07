import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { inspectProjectStructureImports } from "../../scripts/governance/project-structure-policy.mjs";

describe("prompt history ownership", () => {
  it("rejects undeclared and private Pi coupling from the feature", () => {
    expect(inspectProjectStructureImports({
      "src/features/prompt-history/service.ts": 'import { resolvePromptHistoryDataDir } from "../launch/index.js";',
    })).toEqual([expect.stringContaining("may not import launch")]);
    expect(inspectProjectStructureImports({
      "src/features/prompt-history/service.ts": 'import { OwnedEditor } from "../../integrations/pi/components/upstream/components/owned-editor.js";',
    })).toEqual([expect.stringContaining("may not import pi-component-adapter")]);
  });

  it("keeps SQLite and adapted editor source outside the synchronous entry import graph", async () => {
    const service = await readFile("src/features/prompt-history/service.ts", "utf8");
    const shell = await readFile("src/integrations/pi/components/shell-editor-autocomplete.ts", "utf8");
    const loader = await readFile("src/integrations/pi/components/history-editor-loader.ts", "utf8");
    expect(service).not.toMatch(/from ["'](?:node:sqlite|\.\/store\.js)["']/);
    expect(shell).not.toContain('from "./upstream/history/editor-core.js"');
    expect(loader).toContain('await import("./upstream/history/editor-core.js")');
  });

});

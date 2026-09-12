import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { inspectProjectStructureImports } from "../../scripts/governance/project-structure-policy.mjs";

describe("prompt history ownership", () => {
  it("rejects control-store and private Pi coupling from the feature", () => {
    expect(inspectProjectStructureImports({
      "src/features/prompt-history/service.ts": 'import { ControlStore } from "../../foundation/storage/index.js";',
    })).toEqual([expect.stringContaining("may not import storage")]);
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

  it("retains the narrow private-data policy and declared history-only replacement", async () => {
    const policy = await readFile("docs/architecture/resource-and-data-policy.md", "utf8");
    expect(policy).toContain("Typed prompt-history retention");
    expect(policy).toContain("<effective-home>/.a1/data/history");
    const source = await readFile("src/features/prompt-history/store.ts", "utf8");
    expect(source).not.toContain("ControlStore");
    expect(source).not.toMatch(/console\.(?:log|error)|process\.(?:stdout|stderr)\.write/);
    const composition = await readFile("src/composition/owned-ui.ts", "utf8");
    expect(composition).toContain('settings.value("promptHistoryEnabled") === false');
    expect(composition).toContain("profileRoot: adapter.agentDir");
    expect(composition).toContain("dataDir: resolvePromptHistoryDataDir()");
    expect(composition).not.toContain("dataDir: resolveProductPaths().dataDir");
    expect(composition).toContain("configDir: resolveProductPaths().configDir");
  });
});

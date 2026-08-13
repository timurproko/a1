import { describe, expect, it } from "vitest";
import { inspectProjectStructureImports, PROJECT_OWNERS, projectOwnerForPath, testOwnerForPath } from "../../scripts/project-structure-policy.mjs";

describe("project structure ownership policy", () => {
  it("declares every production and test owner with one public entry", () => {
    expect(Object.keys(PROJECT_OWNERS)).toEqual([
      "cli", "launch", "lifecycle", "protocol", "release", "storage", "supervision", "transparent-terminal",
    ]);
    for (const owner of Object.values(PROJECT_OWNERS)) {
      expect(owner.publicEntry).toBe(`${owner.sourceRoot}/index.ts`);
      expect(projectOwnerForPath(`${owner.sourceRoot}/private.ts`)?.id).toBe(owner.id);
      expect(testOwnerForPath(`${owner.testRoot}/contract.test.ts`)).toBe(owner.id);
    }
    expect(testOwnerForPath("test/repository-governance/policy.test.ts")).toBe("repository-governance");
  });

  it("accepts imports through declared public entries", () => {
    expect(inspectProjectStructureImports({
      "src/features/launch/index.ts": "export function profile() { return 'launch'; }",
      "src/cli/dispatch.ts": "import { profile } from '../features/launch/index.js'; export { profile };",
      "src/foundation/lifecycle/index.ts": "export type Id = string;",
      "src/foundation/protocol/messages.ts": "import type { Id } from '../lifecycle/index.js'; export type Message = Id;",
      "src/foundation/protocol/index.ts": "export * from './messages.js';",
      "src/foundation/supervision/server.ts": "import type { Message } from '../protocol/index.js'; export type Server = Message;",
    })).toEqual([]);
  });

  it("rejects cross-owner private deep imports", () => {
    expect(inspectProjectStructureImports({
      "src/cli/dispatch.ts": "import { profile } from '../features/launch/private.js';",
    })).toEqual([
      "src/cli/dispatch.ts: cross-owner import '../features/launch/private.js' must use src/features/launch/index.ts",
    ]);
  });

  it("rejects foundation-to-feature and undeclared dependencies", () => {
    expect(inspectProjectStructureImports({
      "src/foundation/lifecycle/process.ts": "import { profile } from '../../features/launch/index.js';",
      "src/foundation/storage/store.ts": "import { frame } from '../protocol/index.js';",
    })).toEqual([
      "src/foundation/lifecycle/process.ts: lifecycle may not import launch (../../features/launch/index.js)",
      "src/foundation/storage/store.ts: storage may not import protocol (../protocol/index.js)",
    ]);
  });
});

import { describe, expect, it } from "vitest";
import {
  inspectPiFeatureBoundaryImports,
  inspectProjectStructureImports,
  PROJECT_OWNERS,
  projectOwnerForPath,
  testOwnerForPath,
} from "../../scripts/project-structure-policy.mjs";

describe("project structure ownership policy", () => {
  it("declares every production and test owner with one public entry", () => {
    expect(Object.keys(PROJECT_OWNERS)).toEqual([
      "product-identity", "cli", "launch", "workspace", "owned-ui", "lifecycle", "protocol", "release", "storage", "structured-agent-runtime", "native-host-protocol", "owned-ui-contracts", "agent-engine-contracts", "presentation-contracts", "pi-engine-adapter", "pi-component-adapter", "pi-tui-runtime-adapter", "supervision", "workspace-contracts", "transparent-terminal",
    ]);
    for (const owner of Object.values(PROJECT_OWNERS)) {
      if (owner.id === "product-identity") {
        expect(owner.publicEntry).toBe("src/product-identity.ts");
        expect(projectOwnerForPath("src/product-identity.ts")?.id).toBe(owner.id);
        expect(projectOwnerForPath("src/product-identity.json")?.id).toBe(owner.id);
      } else {
        expect(owner.publicEntry).toBe(`${owner.sourceRoot}/index.ts`);
        expect(projectOwnerForPath(`${owner.sourceRoot}/private.ts`)?.id).toBe(owner.id);
      }
      expect(testOwnerForPath(`${owner.testRoot}/contract.test.ts`)).toBe(owner.id);
    }
    expect(testOwnerForPath("test/repository-governance/policy.test.ts")).toBe("repository-governance");
  });

  it("accepts imports through declared public entries", () => {
    expect(inspectProjectStructureImports({
      "src/product-identity.ts": "export const PRODUCT_IDENTITY = { displayName: 'A1' };",
      "src/features/launch/index.ts": "import { PRODUCT_IDENTITY } from '../../product-identity.js'; export function profile() { return PRODUCT_IDENTITY.displayName; }",
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

  it.each([
    [
      "Pi package",
      "import { createAgentSessionRuntime } from '@earendil-works/pi-coding-agent';",
      "feature may not import Pi package '@earendil-works/pi-coding-agent'",
    ],
    [
      "concrete adapter",
      "import { createPiEngineAdapter } from '../../foundation/pi-engine-adapter/index.js';",
      "feature may not import concrete Pi adapter '../../foundation/pi-engine-adapter/index.js'",
    ],
    [
      "Pi-named contract",
      "import type { PiSessionContract } from '../../foundation/owned-ui-contracts/index.js';",
      "feature may not import Pi-named contract 'PiSessionContract'",
    ],
    [
      "Pi component factory",
      "import { createPiShellEditor } from '../../foundation/owned-ui-contracts/index.js';",
      "feature may not import Pi component factory 'createPiShellEditor'",
    ],
  ])("rejects a feature %s with an actionable path", (_kind, source, diagnostic) => {
    const path = "src/features/owned-ui/forbidden.ts";
    const errors = inspectPiFeatureBoundaryImports({ [path]: source });

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain(path);
    expect(errors[0]).toContain(diagnostic);
    expect(errors[0]).toContain("vendor-neutral");
  });

  it("allows features only neutral integration ports and Pi implementations inward", () => {
    expect(inspectProjectStructureImports({
      "src/features/owned-ui/new.ts": "import type { AgentEnginePort } from '../../foundation/agent-engine-contracts/index.js';",
      "src/foundation/pi-engine-adapter/new.ts": "import type { AgentEnginePort } from '../agent-engine-contracts/index.js';",
      "src/foundation/pi-component-adapter/new.ts": "import type { PresentationComponentPort } from '../presentation-contracts/index.js';",
    })).toEqual([]);
    expect(inspectProjectStructureImports({
      "src/features/owned-ui/new.ts": "import { createPiEngineAdapter } from '../../foundation/pi-engine-adapter/index.js';",
    })).toEqual([
      "src/features/owned-ui/new.ts: owned-ui may not import pi-engine-adapter (../../foundation/pi-engine-adapter/index.js)",
    ]);
  });

  it("grandfathers only an exact accepted baseline import statement", () => {
    const path = "src/features/owned-ui/run.ts";
    const source = "import { createPiEngineAdapter } from '../../foundation/pi-engine-adapter/index.js';";
    const approved = [{ path, specifier: "../../foundation/pi-engine-adapter/index.js", statement: source }];

    expect(inspectProjectStructureImports({ [path]: source }, approved)).toEqual([]);
    expect(inspectPiFeatureBoundaryImports({ [path]: source }, approved)).toEqual([]);
    expect(inspectPiFeatureBoundaryImports({
      [path]: `${source}\nimport { createPiShellEditor } from '../../foundation/pi-component-adapter/index.js';`,
    }, approved)).toEqual([
      `${path}: feature may not import concrete Pi adapter '../../foundation/pi-component-adapter/index.js'; inject a vendor-neutral A1 port`,
    ]);
  });
});

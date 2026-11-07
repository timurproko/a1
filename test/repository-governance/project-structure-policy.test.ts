import { describe, expect, it } from "vitest";
import {
  inspectLayerBoundaries,
  inspectPiFeatureBoundaryImports,
  inspectProjectOwnerLayout,
  inspectProjectStructureImports,
  PROJECT_OWNERS,
  projectOwnerForPath,
  testOwnerForPath,
} from "../../scripts/governance/project-structure-policy.mjs";

describe("project structure ownership policy", () => {
  it("declares every production and test owner with one public entry", () => {
    expect(Object.keys(PROJECT_OWNERS)).toEqual([
      "product-identity", "cli", "composition", "session-shell", "launch", "owned-ui", "prompt-suggestions", "prompt-history", "terminal-cleanup", "launch-context", "session-writer-lock", "startup", "lifecycle", "release", "owned-ui-contracts", "ui-components", "ui-apps", "owned-ui-settings", "agent-engine-contracts", "presentation-contracts", "pi-engine-adapter", "pi-component-adapter", "pi-tui-runtime-adapter", "pi-session-presenters",
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

  it("keeps suggestion capture neutral and wired only through composition", () => {
    expect(PROJECT_OWNERS["prompt-suggestions"]?.mayImport).toEqual(["owned-ui-contracts"]);
    expect(inspectProjectStructureImports({
      "src/composition/owned-ui.ts": "import { SuggestionDiagnosticCapture } from '../features/prompt-suggestions/index.js';",
      "src/features/prompt-suggestions/diagnostics.ts": "import type { SuggestionDiagnosticObserver } from '../../contracts/owned-ui/index.js';",
    })).toEqual([]);
    expect(inspectPiFeatureBoundaryImports({
      "src/features/prompt-suggestions/diagnostics.ts": "import { ModelRuntime } from '@earendil-works/pi-coding-agent';",
    })).toHaveLength(1);
  });

  it("keeps terminal cleanup dependency-free and out of the lifecycle foundation", () => {
    expect(PROJECT_OWNERS["terminal-cleanup"]?.mayImport).toEqual([]);
    expect(inspectProjectStructureImports({
      "src/foundation/release/bootstrap.ts": "import { restoreAfterOwnedExit } from '../terminal-cleanup/index.js';",
      "src/integrations/pi/tui-runtime/adapter.ts": "import { boundedCleanup } from '../../../foundation/terminal-cleanup/index.js';",
    })).toEqual([]);
    expect(inspectProjectStructureImports({
      "src/foundation/lifecycle/main.ts": "import { restoreAfterOwnedExit } from '../terminal-cleanup/index.js';",
    })).toEqual([
      "src/foundation/lifecycle/main.ts: lifecycle may not import terminal-cleanup (../terminal-cleanup/index.js)",
    ]);
  });

  it("keeps private launch context dependency-free behind its public entry", () => {
    expect(PROJECT_OWNERS["launch-context"]).toMatchObject({
      layer: "foundation", publicEntry: "src/foundation/launch-context/index.ts", testRoot: "test/foundation/launch-context", mayImport: [],
    });
    expect(inspectProjectStructureImports({
      "src/foundation/startup/startup-runtime.ts": "import { readLaunchContext } from '../launch-context/index.js';",
      "src/foundation/release/bootstrap.ts": "import { withLaunchContext } from '../launch-context/index.js';",
    })).toEqual([]);
  });

  it("rejects declared owners whose source, public entry, or test root is absent", () => {
    const paths = Object.values(PROJECT_OWNERS).flatMap(owner => [
      owner.publicEntry,
      `${owner.sourceRoot}/private.ts`,
      `${owner.testRoot}/contract.test.ts`,
    ]);
    expect(inspectProjectOwnerLayout(paths)).toEqual([]);

    const withoutLaunchContextSource = inspectProjectOwnerLayout(paths.filter(path => !path.startsWith("src/foundation/launch-context/")));
    expect(withoutLaunchContextSource).toContain("launch-context: declared source root has no files (src/foundation/launch-context)");
    expect(withoutLaunchContextSource).toContain("launch-context: declared public entry is missing (src/foundation/launch-context/index.ts)");
    expect(inspectProjectOwnerLayout(paths.filter(path => !path.startsWith("test/foundation/launch-context/")))).toContain(
      "launch-context: declared test root has no files (test/foundation/launch-context)",
    );
  });

  it("accepts imports through declared public entries", () => {
    expect(inspectProjectStructureImports({
      "src/product-identity.ts": "export const PRODUCT_IDENTITY = { displayName: 'A1' };",
      "src/features/launch/index.ts": "import { PRODUCT_IDENTITY } from '../../product-identity.js'; export function profile() { return PRODUCT_IDENTITY.displayName; }",
      "src/cli/dispatch.ts": "import { profile } from '../features/launch/index.js'; export { profile };",
      "src/foundation/lifecycle/index.ts": "export type Id = string;",
      "src/foundation/release/messages.ts": "import type { Id } from '../lifecycle/index.js'; export type Message = Id;",
      "src/foundation/release/index.ts": "export type { Message } from './messages.js';",
      "src/cli/server.ts": "import type { Message } from '../foundation/release/index.js'; export type Server = Message;",
    })).toEqual([]);
  });

  it("rejects a public entry that re-exports a whole module instead of listing names", () => {
    expect(inspectProjectStructureImports({
      "src/foundation/lifecycle/index.ts": "export * from './messages.js';\nexport { encodeFrame } from './framing.js';",
    })).toEqual([
      "src/foundation/lifecycle/index.ts: public entry must list its named exports rather than re-export a whole module",
    ]);
  });

  it("lets only composition and eager startup modules reach past a public entry", () => {
    const files = {
      "src/composition/owned-ui.ts": "import { PromptInput } from '../ui/components/prompt-input.js';",
      "src/app/session-shell/session-shell.ts": "import { PromptInput } from '../../ui/components/prompt-input.js';",
      "src/app/session-shell/quit-outro.ts": "import { ImageAttachmentError } from '../../contracts/owned-ui/image-attachments.js';",
    };
    expect(inspectProjectStructureImports(files, new Set(["src/app/session-shell/session-shell.ts", "src/app/session-shell/quit-outro.ts"]))).toEqual([
      "src/app/session-shell/quit-outro.ts: cross-owner import '../../contracts/owned-ui/image-attachments.js' must use src/contracts/owned-ui/index.ts",
    ]);
    expect(inspectProjectStructureImports(files)).toEqual([
      "src/app/session-shell/session-shell.ts: cross-owner import '../../ui/components/prompt-input.js' must use src/ui/components/index.ts",
      "src/app/session-shell/quit-outro.ts: cross-owner import '../../contracts/owned-ui/image-attachments.js' must use src/contracts/owned-ui/index.ts",
    ]);
  });

  it("keeps the application layer on the contracts instead of any Pi adapter", () => {
    expect(inspectLayerBoundaries({
      "src/app/session-shell/session-shell.ts": "import type { OwnedUiSessionBackend } from '../../contracts/owned-ui/index.js';",
      "src/composition/owned-ui.ts": "import { createPiEngineAdapter, type PiEngineAdapter, type PiSessionPresentationSource } from '../integrations/pi/engine/adapter.js';",
    })).toEqual([]);
    expect(inspectLayerBoundaries({
      "src/app/session-shell/session-shell-root.ts": "import type {\n  PiEngineAdapter,\n} from '../../integrations/pi/engine/adapter.js';",
      "src/app/session-shell/session-shell.ts": "import { PiEngineAdapter } from '../../integrations/pi/engine/index.js';",
      "src/app/session-shell/quit-outro.ts": "import type { PiSessionPresentationSource } from '../../integrations/pi/engine/index.js';",
      "src/app/session-shell/exit-notice.ts": "let backend: import('../../integrations/pi/engine/adapter.js').PiEngineAdapter;",
      "src/app/session-shell/shell-host.ts": "import { PI_TERMINAL_RUNTIME } from '../../integrations/pi/tui-runtime/runtime-factory.js';",
    })).toEqual([
      "src/app/session-shell/session-shell-root.ts: the application layer reaches Pi only through the owned-UI and presentation contracts ('../../integrations/pi/engine/adapter.js')",
      "src/app/session-shell/session-shell.ts: the application layer reaches Pi only through the owned-UI and presentation contracts ('../../integrations/pi/engine/index.js')",
      "src/app/session-shell/quit-outro.ts: the application layer reaches Pi only through the owned-UI and presentation contracts ('../../integrations/pi/engine/index.js')",
      "src/app/session-shell/exit-notice.ts: the application layer reaches Pi only through the owned-UI and presentation contracts ('../../integrations/pi/engine/adapter.js')",
      "src/app/session-shell/shell-host.ts: the application layer reaches Pi only through the owned-UI and presentation contracts ('../../integrations/pi/tui-runtime/runtime-factory.js')",
    ]);
  });

  it("holds the three layer boundaries regardless of the owner DAG", () => {
    expect(inspectLayerBoundaries({
      "src/contracts/owned-ui/index.ts": "export type { PasteEvent } from './paste.js';",
      "src/ui/components/frame.ts": "import type { UiTheme } from '../../contracts/presentation/index.js'; import { spans } from './spans.js';",
      "src/integrations/pi/engine/adapter.ts": "import { AgentSession } from '@earendil-works/pi-coding-agent';",
    })).toEqual([]);
    expect(inspectLayerBoundaries({
      "src/contracts/owned-ui/paste.ts": "import { readFile } from 'node:fs/promises';",
      "src/ui/components/frame.ts": "import { piTheme } from '../../integrations/pi/components/index.js';",
      "src/app/session-shell/session-shell.ts": "import { TUI } from '@earendil-works/pi-tui';",
    })).toEqual([
      "src/contracts/owned-ui/paste.ts: contracts import nothing ('node:fs/promises')",
      "src/ui/components/frame.ts: ui/components import only contracts ('../../integrations/pi/components/index.js')",
      "src/app/session-shell/session-shell.ts: only the Pi adapters import '@earendil-works/pi-tui'",
    ]);
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
      "src/foundation/launch-context/store.ts": "import { claim } from '../lifecycle/index.js';",
    })).toEqual([
      "src/foundation/lifecycle/process.ts: lifecycle may not import launch (../../features/launch/index.js)",
      "src/foundation/launch-context/store.ts: launch-context may not import lifecycle (../lifecycle/index.js)",
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
      "import { createPiEngineAdapter } from '../../integrations/pi/engine/index.js';",
      "feature may not import concrete Pi adapter '../../integrations/pi/engine/index.js'",
    ],
    [
      "concrete Pi integration",
      "import { OwnedUiSessionShell } from '../../app/session-shell/index.js';",
      "feature may not import concrete Pi adapter '../../app/session-shell/index.js'",
    ],
    [
      "Pi-named contract",
      "import type { PiSessionContract } from '../../contracts/owned-ui/index.js';",
      "feature may not import Pi-named contract 'PiSessionContract'",
    ],
    [
      "Pi component factory",
      "import { createPiShellEditor } from '../../contracts/owned-ui/index.js';",
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
      "src/features/owned-ui/new.ts": "import type { AgentSettingsPort } from '../../contracts/agent-engine/index.js';",
      "src/integrations/pi/engine/new.ts": "import type { AgentSettingsPort } from '../../../contracts/agent-engine/index.js';",
      "src/integrations/pi/components/new.ts": "import type { PresentationComponentPort } from '../../../contracts/presentation/index.js';",
    })).toEqual([]);
    expect(inspectProjectStructureImports({
      "src/features/owned-ui/new.ts": "import { createPiEngineAdapter } from '../../integrations/pi/engine/index.js';",
    })).toEqual([
      "src/features/owned-ui/new.ts: owned-ui may not import pi-engine-adapter (../../integrations/pi/engine/index.js)",
    ]);
  });

  it("rejects a feature adapter import with no grandfathered exception", () => {
    const path = "src/features/owned-ui/run.ts";
    const source = "import { createPiEngineAdapter } from '../../integrations/pi/engine/index.js';";

    expect(inspectPiFeatureBoundaryImports({ [path]: source })).toEqual([
      `${path}: feature may not import concrete Pi adapter '../../integrations/pi/engine/index.js'; inject a vendor-neutral A1 port`,
    ]);
  });
});

import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  OwnedUiExtensionPort,
  OwnedUiPinnedPresentationPort,
  OwnedUiSessionBackend,
  OwnedUiSessionCatalogPort,
  OwnedUiSessionIdentityPort,
  OwnedUiSessionPort,
  OwnedUiSessionSettingsPort,
  OwnedUiWorkflowPort,
} from "../../../../src/contracts/owned-ui/index.js";
import { PiEngineAdapter } from "../../../../src/integrations/pi/engine/index.js";

// Invariant: each list names exactly the members its contract port declares, so a member added to
// or dropped from either side fails here as well as at the adapter's `implements` clause.
const PORT_MEMBERS = {
  identity: ["sessionId", "agentDir", "cwd", "sessionGeneration", "sessionBindingGeneration", "disposed", "currentSessionResumeMetadata"],
  session: ["start", "view", "snapshot", "onEvent", "execute", "flushEvents", "dispose"],
  workflows: ["executeWorkflow", "executeBashWorkflow", "cycleModelWorkflow", "workflowAutocompleteCommands", "clearQueuedWorkflows", "reloadBlockedResult", "copyWorkflowText", "setWorkflowInteractionHost"],
  settings: ["productMode", "snapshot", "bindOwner", "setDefaultThinkingLevel", "configuredTheme"],
  catalog: [
    "modelsContext", "setSessionModelScope", "persistModelScope", "refreshModels",
    "pinnedScopedModelsContext", "updateScopedModels", "persistScopedModels", "refreshScopedModels",
    "pinnedProjectTrustContext", "persistProjectTrust",
    "pinnedLoginOptions", "pinnedLoginMethodOptions", "pinnedAmbientAuthentication", "pinnedLogoutOptions", "pinnedForkOptions",
  ],
  extensions: ["nonVisualResources", "extensionResources", "resolveTranscriptImage", "visualExtensionSupport", "unbindExtensionUi", "bindClipboardWriter", "announceReleaseUpdate"],
  pinned: [
    "pinnedModelSelectorContext", "pinnedSessionSelectorContext", "pinnedTreeSelectorContext",
    "pinnedMessageRenderer", "pinnedToolRenderers", "pinnedShortcutDescriptions",
    "pinnedSettingsModels", "bindExtensionUi", "applyPinnedSettingValue",
  ],
} as const satisfies { readonly [Port in keyof OwnedUiSessionBackend]: readonly (keyof OwnedUiSessionBackend[Port])[] };

describe("Pi engine adapter as the owned-UI session backend", () => {
  it("is assignable to the declared port and to each sub-port", () => {
    const adapter = new PiEngineAdapter({ cwd: "D:/work", agentDir: "D:/agent", sessionId: "backend-contract" });
    const backend: OwnedUiSessionBackend = adapter;
    expectTypeOf(adapter).toMatchTypeOf<OwnedUiSessionBackend>();
    expectTypeOf(backend.identity).toEqualTypeOf<OwnedUiSessionIdentityPort>();
    expectTypeOf(backend.session).toEqualTypeOf<OwnedUiSessionPort>();
    expectTypeOf(backend.workflows).toEqualTypeOf<OwnedUiWorkflowPort>();
    expectTypeOf(backend.settings).toEqualTypeOf<OwnedUiSessionSettingsPort>();
    expectTypeOf(backend.catalog).toEqualTypeOf<OwnedUiSessionCatalogPort>();
    expectTypeOf(backend.extensions).toEqualTypeOf<OwnedUiExtensionPort>();
    expectTypeOf(backend.pinned).toEqualTypeOf<OwnedUiPinnedPresentationPort>();
  });

  it("serves each sub-port with exactly the contract's members, built once", () => {
    const adapter = new PiEngineAdapter({ cwd: "D:/work", agentDir: "D:/agent", sessionId: "backend-contract" });
    for (const [port, members] of Object.entries(PORT_MEMBERS)) {
      const served = adapter[port as keyof typeof PORT_MEMBERS];
      expect(served, port).toBe(adapter[port as keyof typeof PORT_MEMBERS]);
      expect(Object.keys(served).sort(), port).toEqual([...members].sort());
    }
  });

  it("reads identity at call time, so disposal is visible through a port obtained earlier", async () => {
    const adapter = new PiEngineAdapter({ cwd: "D:/work", agentDir: "D:/agent", sessionId: "backend-contract" });
    const identity = adapter.identity;
    expect(identity).toMatchObject({ sessionId: "backend-contract", agentDir: "D:/agent", cwd: "D:/work", disposed: false });
    expect(identity.sessionGeneration).toBe(adapter.sessionGeneration);
    await adapter.session.dispose();
    expect(identity.disposed).toBe(true);
    expect(adapter.session.view().lifecycle).toBe("stopped");
  });
});

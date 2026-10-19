import { describe, expect, it, vi } from "vitest";
import { createEnginePorts, type EnginePortParts } from "../../../../src/integrations/pi/engine/ports.js";

function harness() {
  const engine = { cwd: "/a", generation: 1, bindingGeneration: 1, currentSessionResumeMetadata: vi.fn(() => null), currentSessionFile: vi.fn(() => "/s") };
  const settings = {
    productMode: "bare",
    pinnedSettingsSnapshot: vi.fn(() => ({ theme: "dark", currentModel: { id: "m" }, availableDefaultModels: [] })),
    bindSettingsOwner: vi.fn(() => () => {}),
    setDefaultThinkingLevel: vi.fn(),
    configuredTheme: vi.fn(() => "dark"),
    applyPinnedSettingValue: vi.fn(),
  };
  const contexts = { loginOptions: vi.fn(() => []), logoutOptions: vi.fn(async () => []), pinnedForkOptions: vi.fn(() => []) };
  const workflows = { executeBashWorkflow: vi.fn(), bindClipboardWriter: vi.fn(() => () => {}) };
  const resources = { workflowAutocompleteCommands: vi.fn(() => []), nonVisualResources: vi.fn(() => []) };
  const extensions = { support: vi.fn(() => ({ supported: true })), bind: vi.fn(async () => {}), unbind: vi.fn(async () => {}) };
  let disposed = false;
  let runner: { getMessageRenderer?: (type: string) => unknown; getToolDefinition?: (name: string) => unknown; resolveToolRenderers?: unknown; getShortcuts?: unknown } | undefined;
  const parts = {
    sessionId: "s1",
    agentDir: "/agent",
    engine,
    contexts,
    workflows,
    settings,
    resources,
    extensions,
    session: { view: vi.fn() },
    disposed: () => disposed,
    executeWorkflow: vi.fn(),
    clearQueuedWorkflows: vi.fn(() => []),
    setWorkflowInteractionHost: vi.fn(),
    announceReleaseUpdate: vi.fn(),
    resolveTranscriptImage: vi.fn(() => null),
    extensionRunner: () => runner,
  } as unknown as EnginePortParts;
  return { ports: createEnginePorts(parts), parts, engine, settings, contexts, workflows, setDisposed: () => { disposed = true; }, setRunner: (value: typeof runner) => { runner = value; } };
}

describe("createEnginePorts", () => {
  it("reads identity at call time so ports follow session replacement and disposal", () => {
    const { ports, engine, setDisposed } = harness();
    expect(ports.identity).toMatchObject({ sessionId: "s1", agentDir: "/agent", cwd: "/a", sessionGeneration: 1, disposed: false });
    engine.cwd = "/b";
    engine.generation = 2;
    setDisposed();
    expect(ports.identity).toMatchObject({ cwd: "/b", sessionGeneration: 2, disposed: true });
    expect(ports.identity.currentSessionFile?.()).toBe("/s");
  });

  it("keeps selector-only model values out of the neutral settings snapshot", () => {
    const { ports, settings } = harness();
    expect(ports.settings.snapshot()).toEqual({ theme: "dark" });
    expect(ports.presentation.pinnedSettingsModels()).toEqual({ currentModel: { id: "m" }, availableDefaultModels: [] });
    expect(ports.settings.productMode).toBe("bare");
    ports.settings.bindOwner("shell", {});
    expect(settings.bindSettingsOwner).toHaveBeenCalledWith("shell", {});
  });

  it("routes catalog, workflow, and extension members to their collaborators", async () => {
    const { ports, parts, contexts, workflows } = harness();
    ports.catalog.pinnedLoginOptions("oauth");
    await ports.catalog.pinnedLogoutOptions();
    ports.workflows.executeBashWorkflow("ls", true);
    ports.workflows.clearQueuedWorkflows();
    ports.extensions.announceReleaseUpdate({ version: "1", command: "x", changelogUrl: null });
    expect(contexts.loginOptions).toHaveBeenCalledWith("oauth");
    expect(contexts.logoutOptions).toHaveBeenCalledOnce();
    expect(workflows.executeBashWorkflow).toHaveBeenCalledWith("ls", true);
    expect(parts.clearQueuedWorkflows).toHaveBeenCalledOnce();
    expect(parts.announceReleaseUpdate).toHaveBeenCalledOnce();
    expect(ports.session).toBe(parts.session);
  });

  it("reads pinned renderers from the running session's extension runner", () => {
    const { ports, setRunner } = harness();
    expect(ports.presentation.pinnedMessageRenderer("note")).toBeUndefined();
    expect(ports.presentation.pinnedShortcutDescriptions({} as never)).toEqual([]);
    const definition = { name: "tool" };
    setRunner({
      getMessageRenderer: type => `renderer:${type}`,
      getToolDefinition: () => definition,
      getShortcuts: () => new Map([["ctrl+x", { description: undefined, extensionPath: "/ext" }]]),
    });
    expect(ports.presentation.pinnedMessageRenderer("note")).toBe("renderer:note");
    expect(ports.presentation.pinnedToolRenderers("tool")).toBe(definition);
    expect(ports.presentation.pinnedShortcutDescriptions({} as never)).toEqual([{ key: "ctrl+x", description: "/ext" }]);
    setRunner({ resolveToolRenderers: (_name: string, fallback: () => unknown) => ({ resolved: fallback() }), getToolDefinition: () => definition });
    expect(ports.presentation.pinnedToolRenderers("tool")).toEqual({ resolved: definition });
  });
});

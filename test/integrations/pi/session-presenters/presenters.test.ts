import { afterEach, describe, expect, it, vi } from "vitest";
import type { OwnedUiDialogHost, OwnedUiInputSurface } from "../../../../src/contracts/owned-ui/index.js";
import type { PiShellLazySelectorLoader } from "../../../../src/integrations/pi/components/lazy-selectors.js";
import { createPiSessionPresenters, type PiSessionPresenterBackend } from "../../../../src/integrations/pi/session-presenters/index.js";

// Rationale: the factories are replaced so each case drives a presenter's callbacks directly; the shell suites
// cover the real components end to end.
const created = vi.hoisted(() => new Map<string, { readonly options: any; readonly component: any }>());
vi.mock("../../../../src/integrations/pi/components/shell-selectors-dialogs.js", () => {
  const surface = (name: string, options: any, extra: object = {}) => {
    const component = { name, render: () => [name], invalidate() {}, dispose: vi.fn(), ...extra };
    created.set(name, { options, component });
    return component;
  };
  const refreshing = () => ({ updateModels: vi.fn(), setRefreshStatus: vi.fn(), dirty: () => false });
  return {
    createPiShellModelSelector: (options: any) => surface("model", options),
    createPiShellSessionSelector: async (options: any) => surface("session", options),
    createPiShellSettingsSelector: (options: any) => surface("settings", options),
    createPiShellModelsDialog: (options: any) => surface("models", options, refreshing()),
    createPiShellScopedModelsSelector: (options: any) => surface("scoped", options, refreshing()),
  };
});

function opened(name: string) {
  const value = created.get(name);
  if (value === undefined) throw new Error(`${name} was not created`);
  return value;
}

function fakeBackend() {
  const source = {
    pinnedModelSelectorContext: vi.fn(() => ({ currentModel: undefined, modelRuntime: {}, scopedModels: [] })),
    pinnedSessionSelectorContext: vi.fn(() => ({
      loadCurrentSessions: async () => [], loadAllSessions: async () => [], currentSessionFilePath: "D:/s.jsonl", renameSession: async () => {},
    })),
    pinnedTreeSelectorContext: vi.fn(() => ({
      tree: [{ id: "leaf" }] as unknown[], currentLeafId: "leaf", filterMode: "default", skipSummaryPrompt: false, appendLabelChange: vi.fn(),
    })),
    pinnedMessageRenderer: vi.fn((_customType: string): unknown => undefined),
    pinnedToolRenderers: vi.fn((_toolName: string): unknown => undefined),
    pinnedShortcutDescriptions: vi.fn(() => [{ key: "ctrl+k", description: "Extension" }]),
    pinnedSettingsModels: vi.fn(() => ({ availableDefaultModels: [] })),
    applyPinnedSettingValue: vi.fn(async (_callback: string, _value: unknown) => ({ command: "settings", outcome: "completed", message: "" })),
  };
  const refreshes: { signal: AbortSignal; resolve: (value: any) => void; reject: (error: unknown) => void }[] = [];
  const refresh = (signal: AbortSignal) => new Promise((resolve, reject) => { refreshes.push({ signal, resolve, reject }); });
  const catalog = {
    modelsContext: () => ({ models: [], activeModelId: null, sessionScopeIds: [], persistedScopeIds: [] }),
    setSessionModelScope: vi.fn(),
    persistModelScope: vi.fn(),
    refreshModels: vi.fn(refresh),
    pinnedScopedModelsContext: () => ({ models: [], enabledModelIds: null }),
    updateScopedModels: vi.fn(),
    persistScopedModels: vi.fn(),
    refreshScopedModels: vi.fn(refresh),
  };
  const backend = {
    presentationSource: vi.fn(() => source),
    catalog,
    settings: { snapshot: () => ({ availableThinkingLevels: [], availableThemes: [], warnings: {}, modelThinkingLevels: {} }) },
    identity: { sessionBindingGeneration: 1 },
    workflows: { copyWorkflowText: vi.fn(async () => true) },
  } as unknown as PiSessionPresenterBackend;
  return { backend, source, catalog, refreshes };
}

function fakeHost(overrides: Partial<OwnedUiDialogHost> = {}) {
  let surface: OwnedUiInputSurface | null = null;
  const host = {
    disposed: false,
    setInputSurface: vi.fn((next: OwnedUiInputSurface | null) => { surface = next; }),
    requestRender: vi.fn(),
    viewport: () => ({ columns: 90, rows: 30 }),
    appendWorkflowStatus: vi.fn(),
    appendWorkflowResult: vi.fn(),
    runWorkflow: vi.fn(async () => ({ outcome: "completed" as const, diagnostic: null })),
    ...overrides,
  };
  return { host, surface: () => surface };
}

function treeLoader(): PiShellLazySelectorLoader & { readonly tree: ReturnType<typeof vi.fn> } {
  const tree = vi.fn(async (_options: unknown) => ({ render: () => ["tree"], invalidate() {} }));
  return { prepare: async () => {}, createThinking: async () => ({ render: () => [], invalidate() {} }), createTree: tree, tree };
}

afterEach(() => {
  created.clear();
  vi.useRealTimers();
});

describe("Pi session presenters", () => {
  it("reads engine objects only when a presenter runs and passes renderers on as opaque objects", () => {
    const { backend, source } = fakeBackend();
    const presenters = createPiSessionPresenters(backend);
    expect(backend.presentationSource).not.toHaveBeenCalled();

    const renderers = presenters.transcriptRenderers();
    const renderer = { render() {} };
    const resolver = () => undefined;
    source.pinnedMessageRenderer.mockReturnValueOnce(renderer).mockReturnValueOnce("not a renderer");
    source.pinnedToolRenderers.mockReturnValueOnce(resolver).mockReturnValueOnce(null);
    expect(renderers.getMessageRenderer("note")).toBe(renderer);
    expect(renderers.getMessageRenderer("note")).toBeUndefined();
    expect(renderers.getToolRenderers("bash")).toBe(resolver);
    expect(renderers.getToolRenderers("bash")).toBeUndefined();
    expect(renderers.getShortcuts({ "app.exit": "ctrl+d" })).toEqual([{ key: "ctrl+k", description: "Extension" }]);
    expect(source.pinnedShortcutDescriptions).toHaveBeenCalledWith({ "app.exit": "ctrl+d" });
  });

  it("switches or persists the selected model through the host's workflow and closes the selector", () => {
    const { backend } = fakeBackend();
    const { host, surface } = fakeHost();
    createPiSessionPresenters(backend).openModelSelector(host, "gpt");
    const { options, component } = opened("model");
    expect(surface()).toBe(component);
    expect(options.initialSearchInput).toBe("gpt");
    expect([options.runtime.getColumns(), options.runtime.getRows()]).toEqual([90, 30]);

    options.onSelect({ provider: "openai", id: "gpt-5" });
    expect(surface()).toBeNull();
    expect(host.runWorkflow).toHaveBeenLastCalledWith({ command: "model", argument: "", selection: "openai/gpt-5" });
    options.onSelectAsDefault({ provider: "anthropic", modelId: "claude" });
    expect(host.runWorkflow).toHaveBeenLastCalledWith({ command: "model", argument: "", selection: "anthropic/claude", persist: true });
  });

  it("resumes a selected session and hands exit back to the shell after closing", async () => {
    const { backend } = fakeBackend();
    const { host, surface } = fakeHost();
    const exit = vi.fn(() => expect(surface()).toBeNull());
    await createPiSessionPresenters(backend).openSessionSelector(host, exit);
    const { options, component } = opened("session");
    expect(surface()).toBe(component);
    expect(options.currentSessionFilePath).toBe("D:/s.jsonl");
    options.onSelect("D:/other.jsonl");
    expect(host.runWorkflow).toHaveBeenCalledWith({ command: "resume", argument: "D:/other.jsonl" });
    options.onExit();
    expect(exit).toHaveBeenCalledOnce();
  });

  it("reports an empty tree, holds presentation while the selector loads, and skips a disposed host", async () => {
    const { backend, source } = fakeBackend();
    const loader = treeLoader();
    const presenters = createPiSessionPresenters(backend, { lazySelectors: loader });

    source.pinnedTreeSelectorContext.mockReturnValueOnce({ ...source.pinnedTreeSelectorContext(), tree: [] });
    const empty = fakeHost();
    await presenters.openTreeSelector(empty.host, vi.fn());
    expect(empty.host.appendWorkflowStatus).toHaveBeenCalledWith("No entries in session");
    expect(loader.tree).not.toHaveBeenCalled();

    const release = vi.fn();
    const held = fakeHost({ beginPresentationHold: () => release });
    await presenters.openTreeSelector(held.host, vi.fn(), "entry-2");
    expect(loader.tree).toHaveBeenCalledWith(expect.objectContaining({ terminalHeight: 30, initialSelectedId: "entry-2", initialFilterMode: "default" }));
    expect(held.surface()).not.toBeNull();
    expect(release).toHaveBeenCalledOnce();

    const disposed = fakeHost({ disposed: true });
    await presenters.openTreeSelector(disposed.host, vi.fn());
    expect(disposed.host.setInputSurface).not.toHaveBeenCalled();
  });

  it("stays on the current leaf, and navigates elsewhere, closing first only when no summary prompt follows", async () => {
    const { backend, source } = fakeBackend();
    const loader = treeLoader();
    const presenters = createPiSessionPresenters(backend, { lazySelectors: loader });
    const { host, surface } = fakeHost();
    const navigate = vi.fn();
    await presenters.openTreeSelector(host, navigate);
    const tree = loader.tree.mock.calls[0]![0] as { onSelect(id: string): void };
    tree.onSelect("leaf");
    expect(host.appendWorkflowStatus).toHaveBeenCalledWith("Already at this point");
    expect(navigate).not.toHaveBeenCalled();

    await presenters.openTreeSelector(host, navigate);
    (loader.tree.mock.calls[1]![0] as { onSelect(id: string): void }).onSelect("older");
    expect(navigate).toHaveBeenCalledWith("older", false);
    expect(surface()).not.toBeNull();

    source.pinnedTreeSelectorContext.mockReturnValueOnce({ ...source.pinnedTreeSelectorContext(), skipSummaryPrompt: true });
    await presenters.openTreeSelector(host, navigate);
    (loader.tree.mock.calls[2]![0] as { onSelect(id: string): void }).onSelect("older");
    expect(navigate).toHaveBeenLastCalledWith("older", true);
    expect(surface()).toBeNull();
  });

  it("applies settings and changes TUI mode only where the host can switch it", async () => {
    const { backend, source } = fakeBackend();
    const presenters = createPiSessionPresenters(backend);

    const fixed = fakeHost();
    presenters.openSettingsSelector(fixed.host);
    opened("settings").options.onChange("onTuiModeChange", "regular");
    expect(source.applyPinnedSettingValue).not.toHaveBeenCalled();

    const blocked = fakeHost({ switchTuiMode: () => false });
    presenters.openSettingsSelector(blocked.host);
    opened("settings").options.onChange("onTuiModeChange", "regular");
    expect(blocked.host.appendWorkflowStatus).toHaveBeenCalledWith("Close active overlays before changing TUI mode");
    expect(source.applyPinnedSettingValue).not.toHaveBeenCalled();

    const switching = fakeHost({ switchTuiMode: () => true });
    presenters.openSettingsSelector(switching.host);
    opened("settings").options.onChange("onTuiModeChange", "fullscreen");
    await vi.waitFor(() => expect(switching.host.appendWorkflowStatus).toHaveBeenCalledWith("TUI mode: fullscreen"));
    expect(source.applyPinnedSettingValue).toHaveBeenCalledWith("onTuiModeChange", "fullscreen");

    const failure = { command: "settings", outcome: "failed", message: "not bound" };
    source.applyPinnedSettingValue.mockResolvedValueOnce(failure);
    opened("settings").options.onChange("onShowImagesChange", false);
    await vi.waitFor(() => expect(switching.host.appendWorkflowResult).toHaveBeenCalledWith(failure));
    opened("settings").options.onChange("onCancel", undefined);
    expect(switching.surface()).toBeNull();
  });

  it("drops a models refresh that settles after the dialog closed and aborts it on close", async () => {
    const { backend, catalog, refreshes } = fakeBackend();
    const { host } = fakeHost();
    createPiSessionPresenters(backend).openModelsDialog(host, "claude");
    const { options, component } = opened("models");
    expect(options.initialQuery).toBe("claude");
    expect(catalog.refreshModels).toHaveBeenCalledOnce();
    options.onCancel();
    expect(refreshes[0]!.signal.aborted).toBe(true);
    refreshes[0]!.resolve({ models: [], status: "Model catalogs refreshed.", statusKind: "success" });
    await Promise.resolve();
    await Promise.resolve();
    expect(component.updateModels).not.toHaveBeenCalled();
    expect(component.setRefreshStatus).not.toHaveBeenCalled();
  });

  it("reports a refresh that outlived fifteen seconds as timed out, for both models dialogs", async () => {
    vi.useFakeTimers();
    for (const name of ["models", "scoped"] as const) {
      const { backend, refreshes } = fakeBackend();
      const presenters = createPiSessionPresenters(backend);
      const { host } = fakeHost();
      if (name === "models") presenters.openModelsDialog(host);
      else presenters.openScopedModelsSelector(host);
      const { component } = opened(name);
      await vi.advanceTimersByTimeAsync(15_000);
      expect(refreshes[0]!.signal.aborted).toBe(true);
      refreshes[0]!.reject(new Error("aborted"));
      await vi.waitFor(() => expect(component.setRefreshStatus).toHaveBeenCalledWith("Model refresh timed out; showing cached models.", "warning"));
      component.dispose();
    }
  });

  it("keeps pending scoped-model edits when the refreshed catalog arrives", async () => {
    const { backend, catalog, refreshes } = fakeBackend();
    const { host } = fakeHost();
    createPiSessionPresenters(backend).openScopedModelsSelector(host);
    const { options, component } = opened("scoped");
    options.onChange(["openai/gpt-5"]);
    const models = [{ provider: "openai", id: "gpt-5", name: "GPT-5" }];
    refreshes[0]!.resolve({ models, enabledModelIds: null, status: "Model catalogs refreshed.", statusKind: "success" });
    await vi.waitFor(() => expect(component.setRefreshStatus).toHaveBeenCalledWith("Model catalogs refreshed.", "success"));
    expect(component.updateModels).toHaveBeenCalledWith(models);
    expect(catalog.updateScopedModels).toHaveBeenLastCalledWith(["openai/gpt-5"]);
  });
});

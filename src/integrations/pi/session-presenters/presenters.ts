import type {
  OwnedUiDialogHost,
  OwnedUiSessionBackend,
  OwnedUiSessionPresenters,
  OwnedUiTranscriptRendererPort,
} from "../../../contracts/owned-ui/index.js";
import type { PiSessionPresentationSource } from "../engine/adapter.js";
import type { PiShellLazySelectorLoader } from "../components/lazy-selectors.js";
import {
  createPiShellModelSelector,
  createPiShellModelsDialog,
  createPiShellScopedModelsSelector,
  createPiShellSessionSelector,
  createPiShellSettingsSelector,
  type PiShellModelsDialogPort,
  type PiShellScopedModelsSelectorPort,
  type PiShellSettingsSelectorOptions,
} from "../components/shell-selectors-dialogs.js";

const MODEL_REFRESH_TIMEOUT_MS = 15_000;
const MODEL_REFRESH_TIMED_OUT = "Model refresh timed out; showing cached models.";

/** The session backend plus the Pi objects its selectors are built from; the Pi engine adapter is one. */
export interface PiSessionPresenterBackend extends OwnedUiSessionBackend {
  presentationSource(): PiSessionPresentationSource;
}

export interface PiSessionPresentersOptions {
  /** Test seam for pending and failed optional selector-module preparation. */
  readonly lazySelectors?: PiShellLazySelectorLoader;
}

/**
 * Builds the selectors and transcript renderers whose inputs are Pi engine objects. This owner is the one place
 * that sees both the engine adapter and the Pi components, so the shell only ever holds the neutral port.
 */
export function createPiSessionPresenters(adapter: PiSessionPresenterBackend, options: PiSessionPresentersOptions = {}): OwnedUiSessionPresenters {
  const source = () => adapter.presentationSource();
  let lazySelectors = options.lazySelectors;
  let lazySelectorsPromise: Promise<PiShellLazySelectorLoader> | undefined;
  // Performance: the tree selector module stays out of the startup graph and loads on first use.
  const loadLazySelectors = (): Promise<PiShellLazySelectorLoader> => {
    if (lazySelectors !== undefined) return Promise.resolve(lazySelectors);
    return lazySelectorsPromise ??= import("../components/lazy-selectors.js").then(module => {
      lazySelectors = module.piShellLazySelectors;
      return module.piShellLazySelectors;
    });
  };
  const renderers: OwnedUiTranscriptRendererPort = {
    getMessageRenderer: customType => opaqueRenderer(source().pinnedMessageRenderer(customType)),
    getToolRenderers: toolName => opaqueRenderer(source().pinnedToolRenderers(toolName)),
    // Compatibility: the component adapter passes Pi's own keybinding config through the neutral port.
    getShortcuts: bindings => source().pinnedShortcutDescriptions(bindings as Parameters<PiSessionPresentationSource["pinnedShortcutDescriptions"]>[0]),
  };

  return {
    transcriptRenderers: () => renderers,

    openModelSelector(host, initialSearchInput) {
      const context = source().pinnedModelSelectorContext();
      const close = closeSurface(host);
      const component = createPiShellModelSelector({
        ...context,
        runtime: {
          getColumns: () => host.viewport().columns,
          getRows: () => host.viewport().rows,
          requestRender: () => host.requestRender(),
        },
        ...(initialSearchInput === undefined ? {} : { initialSearchInput }),
        onSelect: model => {
          close();
          void host.runWorkflow({ command: "model", argument: "", selection: modelReference(model) });
        },
        onSelectAsDefault: model => {
          close();
          void host.runWorkflow({ command: "model", argument: "", selection: modelReference(model), persist: true });
        },
        onCancel: close,
      });
      host.setInputSurface(component);
      host.requestRender();
    },

    async openSessionSelector(host, onExit) {
      const context = source().pinnedSessionSelectorContext();
      const close = closeSurface(host);
      const component = await createPiShellSessionSelector({
        currentSessionsLoader: context.loadCurrentSessions,
        allSessionsLoader: context.loadAllSessions,
        currentSessionFilePath: context.currentSessionFilePath,
        renameSession: context.renameSession,
        requestRender: () => host.requestRender(),
        onSelect: sessionPath => {
          close();
          void host.runWorkflow({ command: "resume", argument: sessionPath });
        },
        onCancel: close,
        onExit: () => {
          close();
          onExit();
        },
      });
      host.setInputSurface(component);
      host.requestRender();
    },

    async openTreeSelector(host, navigate, initialSelectedId) {
      const context = source().pinnedTreeSelectorContext();
      if (context.tree.length === 0) {
        host.appendWorkflowStatus("No entries in session");
        host.requestRender();
        return;
      }
      const close = closeSurface(host);
      const releasePresentation = host.beginPresentationHold?.();
      try {
        const selectors = await loadLazySelectors();
        const component = await selectors.createTree({
          tree: context.tree,
          currentLeafId: context.currentLeafId,
          terminalHeight: host.viewport().rows,
          initialFilterMode: context.filterMode,
          ...(initialSelectedId === undefined ? {} : { initialSelectedId }),
          onLabelChange: context.appendLabelChange,
          onCopy: text => {
            if (!text) {
              host.appendWorkflowResult({ command: "tree", outcome: "failed", message: "Selected entry has no text to copy" });
              host.requestRender();
              return;
            }
            const generation = adapter.identity.sessionBindingGeneration;
            const stale = () => host.disposed || generation !== adapter.identity.sessionBindingGeneration;
            void adapter.workflows.copyWorkflowText(text).then(acknowledged => {
              if (stale()) return;
              host.appendWorkflowStatus(acknowledged ? "Copied selected message to clipboard" : "Submitted selected message to clipboard");
              host.requestRender();
            }).catch(error => {
              if (stale()) return;
              host.appendWorkflowResult({ command: "tree", outcome: "failed", message: error instanceof Error ? error.message : String(error) });
              host.requestRender();
            });
          },
          onCancel: close,
          onSelect: entryId => {
            if (entryId === context.currentLeafId) {
              close();
              host.appendWorkflowStatus("Already at this point");
              host.requestRender();
              return;
            }
            if (context.skipSummaryPrompt) close();
            navigate(entryId, context.skipSummaryPrompt);
          },
        });
        if (host.disposed) return;
        host.setInputSurface(component);
        host.requestRender();
      } finally {
        releasePresentation?.();
      }
    },

    openSettingsSelector(host) {
      const snapshot = adapter.settings.snapshot();
      const { currentModel, availableDefaultModels } = source().pinnedSettingsModels();
      const close = closeSurface(host);
      const component = createPiShellSettingsSelector({
        config: {
          ...snapshot,
          availableThinkingLevels: [...snapshot.availableThinkingLevels],
          availableThemes: [...snapshot.availableThemes],
          warnings: { ...snapshot.warnings },
          modelThinkingLevels: { ...snapshot.modelThinkingLevels } as PiShellSettingsSelectorOptions["config"]["modelThinkingLevels"],
          ...(currentModel === undefined ? {} : { currentModel: currentModel as NonNullable<PiShellSettingsSelectorOptions["config"]["currentModel"]> }),
          availableDefaultModels: availableDefaultModels as PiShellSettingsSelectorOptions["config"]["availableDefaultModels"],
        },
        onChange: (callback, value) => {
          if (callback === "onCancel") {
            close();
            return;
          }
          if (callback === "onTuiModeChange") {
            // Invariant: a surface that cannot change TUI mode (bare A1 is permanently fullscreen) ignores this callback.
            if (host.switchTuiMode === undefined) return;
            if (value !== "regular" && value !== "fullscreen") return;
            if (!host.switchTuiMode(value)) {
              host.appendWorkflowStatus("Close active overlays before changing TUI mode");
              host.requestRender();
              return;
            }
          }
          void source().applyPinnedSettingValue(callback, value).then(result => {
            if (result.outcome === "failed") host.appendWorkflowResult(result);
            else if (callback === "onTuiModeChange") host.appendWorkflowStatus(`TUI mode: ${value}`);
            host.requestRender();
          });
        },
        onCancel: close,
      });
      host.setInputSurface(component);
      host.requestRender();
    },

    /** The bare-A1 unified Models dialog: switch on Enter, scope on Space, persist on Ctrl+S, all through the engine. */
    openModelsDialog(host, initialQuery) {
      const catalog = adapter.catalog;
      const context = catalog.modelsContext();
      const available = new Set(context.models.map(model => `${model.provider}/${model.id}`));
      const savedScopeIds = context.persistedScopeIds.filter(id => available.has(id));
      // Invariant: an explicit session scope wins; otherwise the dialog starts from what is persisted, never from "all rows scoped".
      const scopeIds = context.sessionScopeIds.length > 0 ? context.sessionScopeIds : savedScopeIds;
      const refresh = new ModelCatalogRefresh();
      const close = () => {
        refresh.stop();
        host.setInputSurface(null);
        host.requestRender();
      };
      const dialog = createPiShellModelsDialog({
        models: context.models,
        activeModelId: context.activeModelId,
        scopeIds,
        savedScopeIds,
        ...(initialQuery === undefined ? {} : { initialQuery }),
        refreshStatus: "Refreshing model catalogs…",
        requestRender: () => host.requestRender(),
        onSelect: modelId => {
          void host.runWorkflow({ command: "models", argument: "", selection: modelId }).then(result => {
            if (!refresh.stopped && result.outcome === "completed") close();
          });
        },
        onScopeChange: ids => {
          catalog.setSessionModelScope(ids);
          host.requestRender();
        },
        onSave: ids => {
          try {
            catalog.persistModelScope(ids);
          } catch (error) {
            host.appendWorkflowResult({ command: "models", outcome: "failed", message: error instanceof Error ? error.message : String(error) });
            host.requestRender();
            throw error;
          }
          host.appendWorkflowStatus("Model selection saved to settings");
          host.requestRender();
        },
        onCancel: close,
      });
      const component: PiShellModelsDialogPort = {
        ...dialog,
        dispose: () => {
          refresh.stop();
          dialog.dispose?.();
        },
      };
      host.setInputSurface(component);
      host.requestRender();
      refresh.run(host, component, signal => catalog.refreshModels(signal), refreshed => component.updateModels(refreshed.models));
    },

    openScopedModelsSelector(host) {
      const catalog = adapter.catalog;
      const initial = catalog.pinnedScopedModelsContext();
      let currentEnabledIds = initial.enabledModelIds === null ? null : [...initial.enabledModelIds];
      let selectionChanged = false;
      const refresh = new ModelCatalogRefresh();
      const close = () => {
        refresh.stop();
        host.setInputSurface(null);
        host.requestRender();
      };
      const selector = createPiShellScopedModelsSelector({
        models: initial.models,
        enabledModelIds: currentEnabledIds,
        refreshStatus: "Refreshing model catalogs…",
        onChange: enabledIds => {
          selectionChanged = true;
          currentEnabledIds = enabledIds === null ? null : [...enabledIds];
          catalog.updateScopedModels(currentEnabledIds);
          host.requestRender();
        },
        onPersist: enabledIds => {
          currentEnabledIds = enabledIds === null ? null : [...enabledIds];
          catalog.persistScopedModels(currentEnabledIds);
          host.appendWorkflowStatus("Model selection saved to settings");
          host.requestRender();
        },
        onCancel: close,
      });
      const component: PiShellScopedModelsSelectorPort = {
        ...selector,
        dispose: () => {
          refresh.stop();
          selector.dispose?.();
        },
      };
      host.setInputSurface(component);
      host.requestRender();
      refresh.run(host, component, signal => catalog.refreshScopedModels(signal), refreshed => {
        if (!selectionChanged) {
          currentEnabledIds = refreshed.enabledModelIds === null ? null : [...refreshed.enabledModelIds];
          component.updateModels(refreshed.models, currentEnabledIds);
        } else {
          component.updateModels(refreshed.models);
          catalog.updateScopedModels(currentEnabledIds);
        }
      });
    },
  };
}

/**
 * One model-catalog refresh owned by an open dialog: it aborts after fifteen seconds or when the dialog
 * closes, and a result that arrives after the dialog closed is dropped.
 */
class ModelCatalogRefresh {
  readonly #controller = new AbortController();
  readonly #timeout: ReturnType<typeof setTimeout>;
  #stopped = false;
  #timedOut = false;

  constructor() {
    this.#timeout = setTimeout(() => {
      this.#timedOut = true;
      this.#controller.abort();
    }, MODEL_REFRESH_TIMEOUT_MS);
  }

  get stopped(): boolean { return this.#stopped; }

  stop(): void {
    this.#stopped = true;
    clearTimeout(this.#timeout);
    this.#controller.abort();
  }

  run<T extends { readonly status: string; readonly statusKind: "success" | "warning" }>(
    host: OwnedUiDialogHost,
    dialog: { setRefreshStatus(message: string, kind: "muted" | "success" | "warning"): void },
    refresh: (signal: AbortSignal) => Promise<T>,
    apply: (refreshed: T) => void,
  ): void {
    void refresh(this.#controller.signal).then(refreshed => {
      if (this.#stopped) return;
      apply(refreshed);
      dialog.setRefreshStatus(
        this.#timedOut ? MODEL_REFRESH_TIMED_OUT : refreshed.status,
        this.#timedOut ? "warning" : refreshed.statusKind,
      );
      host.requestRender();
    }).catch(error => {
      if (this.#stopped) return;
      dialog.setRefreshStatus(
        this.#timedOut
          ? MODEL_REFRESH_TIMED_OUT
          : `Could not refresh model catalogs: ${error instanceof Error ? error.message : String(error)}`,
        "warning",
      );
      host.requestRender();
    }).finally(() => clearTimeout(this.#timeout));
  }
}

function closeSurface(host: OwnedUiDialogHost): () => void {
  return () => {
    host.setInputSurface(null);
    host.requestRender();
  };
}

function opaqueRenderer(value: unknown): object | undefined {
  return (typeof value === "object" && value !== null) || typeof value === "function" ? value : undefined;
}

function modelReference(model: unknown): string {
  if (typeof model !== "object" || model === null) return "";
  const value = model as { provider?: unknown; id?: unknown; modelId?: unknown };
  const provider = typeof value.provider === "string" ? value.provider : "";
  const id = typeof value.id === "string" ? value.id : typeof value.modelId === "string" ? value.modelId : "";
  return provider && id ? `${provider}/${id}` : "";
}

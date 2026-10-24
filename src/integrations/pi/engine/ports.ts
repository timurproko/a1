import type { AgentSession } from "../startup-public.js";
import type {
  OwnedUiExtensionPort,
  OwnedUiImageAttachment,
  OwnedUiReleaseUpdate,
  OwnedUiSessionCatalogPort,
  OwnedUiSessionIdentityPort,
  OwnedUiSessionPort,
  OwnedUiSessionSettingsPort,
  OwnedUiWorkflowPort,
} from "../../../contracts/owned-ui/index.js";
import type {
  PiPinnedSettingsCallback,
  PiPinnedSettingsSnapshot,
  PiSessionSelectorContext,
  PiTreeSelectorContext,
  PiWorkflowInteractionHost,
  PiWorkflowRequest,
  PiWorkflowResult,
} from "./workflows.js";
import type { PiExtensionUiBinding } from "./extension-ui-binding.js";
import type { PiResourceCatalog } from "./resource-catalog.js";
import type { PiEngineRuntime } from "./session-runtime.js";
import type { PiEngineSettings } from "./settings-port.js";
import type { PiWorkflowContexts } from "./workflow-contexts.js";
import type { PiWorkflowRunner } from "./workflow-runner.js";

/**
 * The Pi objects pinned selectors and transcript renderers are built from. They are not part of the
 * session backend contract; only the session presenters owner reads them.
 */
export interface PiSessionPresentationSource {
  pinnedModelSelectorContext(): ReturnType<PiWorkflowContexts["pinnedModelSelectorContext"]>;
  pinnedSessionSelectorContext(): PiSessionSelectorContext;
  pinnedTreeSelectorContext(): PiTreeSelectorContext;
  pinnedMessageRenderer(customType: string): unknown;
  pinnedToolRenderers(toolName: string): unknown;
  pinnedShortcutDescriptions(bindings: Parameters<AgentSession["extensionRunner"]["getShortcuts"]>[0]): readonly { readonly key: string; readonly description: string }[];
  pinnedSettingsModels(): Pick<PiPinnedSettingsSnapshot, "currentModel" | "availableDefaultModels">;
  applyPinnedSettingValue(callback: PiPinnedSettingsCallback, value: unknown): Promise<PiWorkflowResult>;
}

export interface PiEngineAdapterPorts {
  readonly identity: OwnedUiSessionIdentityPort;
  readonly session: OwnedUiSessionPort;
  readonly workflows: OwnedUiWorkflowPort;
  readonly settings: OwnedUiSessionSettingsPort;
  readonly catalog: OwnedUiSessionCatalogPort;
  readonly extensions: OwnedUiExtensionPort;
  readonly presentation: PiSessionPresentationSource;
}

/** The adapter's collaborators and its own session operations, which every port member reaches at call time. */
export interface EnginePortParts {
  readonly sessionId: string;
  readonly agentDir: string;
  readonly engine: Pick<PiEngineRuntime, "cwd" | "generation" | "bindingGeneration" | "currentSessionResumeMetadata" | "currentSessionFile" | "session">;
  readonly contexts: PiWorkflowContexts;
  readonly workflows: PiWorkflowRunner;
  readonly settings: PiEngineSettings;
  readonly resources: PiResourceCatalog;
  readonly extensions: PiExtensionUiBinding;
  readonly session: OwnedUiSessionPort;
  disposed(): boolean;
  executeWorkflow(request: PiWorkflowRequest): Promise<PiWorkflowResult>;
  clearQueuedWorkflows(): readonly string[];
  setWorkflowInteractionHost(interaction: PiWorkflowInteractionHost): void;
  announceReleaseUpdate(release: OwnedUiReleaseUpdate): void;
  resolveTranscriptImage(assetId: string): OwnedUiImageAttachment | null;
  /** The running session's extension runner; throws when no session runs. */
  extensionRunner(): AgentSession["extensionRunner"] | undefined;
}

// Invariant: every port member delegates at call time, so ports built once follow session replacement.
export function createEnginePorts(parts: EnginePortParts): PiEngineAdapterPorts {
  const { engine, contexts, workflows, settings, resources, extensions } = parts;
  return {
    identity: {
      sessionId: parts.sessionId,
      agentDir: parts.agentDir,
      get cwd() { return engine.cwd; },
      get sessionGeneration() { return engine.generation; },
      get sessionBindingGeneration() { return engine.bindingGeneration; },
      get disposed() { return parts.disposed(); },
      currentSessionResumeMetadata: () => engine.currentSessionResumeMetadata(),
      currentSessionFile: () => engine.currentSessionFile(),
      currentHistorySessionId: () => {
        const id = engine.session?.sessionManager?.getSessionId?.();
        return typeof id === "string" && id.length > 0 && id.length <= 256 && !id.includes("\0") ? id : null;
      },
    },
    session: parts.session,
    workflows: {
      executeWorkflow: request => parts.executeWorkflow(request),
      executeBashWorkflow: (command, excludeFromContext) => workflows.executeBashWorkflow(command, excludeFromContext),
      cycleModelWorkflow: direction => workflows.cycleModelWorkflow(direction),
      workflowAutocompleteCommands: () => resources.workflowAutocompleteCommands(),
      clearQueuedWorkflows: () => parts.clearQueuedWorkflows(),
      reloadBlockedResult: () => workflows.reloadBlockedResult(),
      copyWorkflowText: text => workflows.copyWorkflowText(text),
      setWorkflowInteractionHost: interaction => { parts.setWorkflowInteractionHost(interaction); },
    },
    settings: {
      get productMode() { return settings.productMode; },
      snapshot: () => {
        // Invariant: the selector-only model values travel on the presentation source, not in the neutral snapshot.
        const { currentModel: _currentModel, availableDefaultModels: _availableDefaultModels, ...snapshot } = settings.pinnedSettingsSnapshot();
        return snapshot;
      },
      bindOwner: (owner, handlers) => settings.bindSettingsOwner(owner, handlers),
      setDefaultThinkingLevel: level => { settings.setDefaultThinkingLevel(level); },
      configuredTheme: () => settings.configuredTheme(),
    },
    catalog: {
      modelsContext: () => contexts.modelsContext(),
      setSessionModelScope: scopeIds => { contexts.setSessionModelScope(scopeIds); },
      persistModelScope: scopeIds => { contexts.persistModelScope(scopeIds); },
      refreshModels: signal => contexts.refreshModels(signal),
      pinnedScopedModelsContext: () => contexts.pinnedScopedModelsContext(),
      updateScopedModels: enabledModelIds => { contexts.updateScopedModels(enabledModelIds); },
      persistScopedModels: enabledModelIds => { contexts.persistScopedModels(enabledModelIds); },
      refreshScopedModels: signal => contexts.refreshScopedModels(signal),
      pinnedProjectTrustContext: () => contexts.pinnedProjectTrustContext(),
      persistProjectTrust: updates => { contexts.persistProjectTrust(updates); },
      pinnedLoginOptions: authType => contexts.loginOptions(authType),
      pinnedLoginMethodOptions: providerReference => contexts.pinnedLoginMethodOptions(providerReference),
      pinnedAmbientAuthentication: selection => contexts.pinnedAmbientAuthentication(selection),
      pinnedLogoutOptions: () => contexts.logoutOptions(),
      pinnedForkOptions: () => contexts.pinnedForkOptions(),
    },
    extensions: {
      nonVisualResources: () => resources.nonVisualResources(),
      extensionResources: () => resources.extensionResources(),
      resolveTranscriptImage: assetId => parts.resolveTranscriptImage(assetId),
      visualExtensionSupport: () => extensions.support(),
      bindExtensionUi: (ui, shutdown) => extensions.bind(ui, shutdown),
      unbindExtensionUi: () => extensions.unbind(),
      bindClipboardWriter: writer => workflows.bindClipboardWriter(writer),
      announceReleaseUpdate: release => { parts.announceReleaseUpdate(release); },
    },
    presentation: {
      pinnedModelSelectorContext: () => contexts.pinnedModelSelectorContext(),
      pinnedSessionSelectorContext: () => contexts.pinnedSessionSelectorContext(),
      pinnedTreeSelectorContext: () => contexts.pinnedTreeSelectorContext(),
      pinnedMessageRenderer: customType => parts.extensionRunner()?.getMessageRenderer?.(customType),
      pinnedToolRenderers: toolName => {
        const runner = parts.extensionRunner();
        if (runner === undefined) return undefined;
        if (typeof runner.resolveToolRenderers === "function") {
          return runner.resolveToolRenderers(toolName, () => runner.getToolDefinition?.(toolName));
        }
        return runner.getToolDefinition?.(toolName);
      },
      pinnedShortcutDescriptions: bindings => {
        const shortcuts = parts.extensionRunner()?.getShortcuts?.(bindings);
        return shortcuts === undefined ? [] : [...shortcuts].map(([key, shortcut]) => ({ key, description: shortcut.description ?? shortcut.extensionPath }));
      },
      pinnedSettingsModels: () => {
        const { currentModel, availableDefaultModels } = settings.pinnedSettingsSnapshot();
        return { ...(currentModel === undefined ? {} : { currentModel }), availableDefaultModels };
      },
      applyPinnedSettingValue: (callback, value) => settings.applyPinnedSettingValue(callback, value),
    },
  };
}

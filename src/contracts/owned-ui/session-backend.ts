/**
 * The session backend the owned shell presents. The shell and composition depend on this port,
 * never on an engine adapter class, so a per-tab or non-Pi backend can stand behind the shell.
 */
import type { OwnedUiExtensionUiPort } from "./extension-ui.js";
import type { OwnedUiCommand, OwnedUiEvent, OwnedUiImageAttachment, OwnedUiSessionViewModel, OwnedUiSnapshot } from "./model.js";
import type {
  OwnedUiAmbientAuthentication,
  OwnedUiAuthenticationProviderOption,
  OwnedUiBashWorkflowResult,
  OwnedUiCommandResult,
  OwnedUiExtensionResourceSummary,
  OwnedUiModelsContext,
  OwnedUiModelsRefreshResult,
  OwnedUiProjectTrustContext,
  OwnedUiProjectTrustUpdate,
  OwnedUiReleaseUpdate,
  OwnedUiResourceSummary,
  OwnedUiScopedModelsContext,
  OwnedUiScopedModelsRefreshResult,
  OwnedUiSessionProductMode,
  OwnedUiSessionResumeMetadata,
  OwnedUiSessionSettingsSnapshot,
  OwnedUiSettingOwner,
  OwnedUiSettingOwnerHandlers,
  OwnedUiSettingsThinkingLevel,
  OwnedUiVisualExtensionSupport,
  OwnedUiWorkflowAutocompleteCommand,
  OwnedUiWorkflowInteractionHost,
  OwnedUiWorkflowOption,
  OwnedUiWorkflowRequest,
  OwnedUiWorkflowResult,
} from "./session-workflows.js";

export interface OwnedUiSessionBackend {
  readonly identity: OwnedUiSessionIdentityPort;
  readonly session: OwnedUiSessionPort;
  readonly workflows: OwnedUiWorkflowPort;
  readonly settings: OwnedUiSessionSettingsPort;
  readonly catalog: OwnedUiSessionCatalogPort;
  readonly extensions: OwnedUiExtensionPort;
}

/** Which session this is, where it lives, and how often it has been replaced. */
export interface OwnedUiSessionIdentityPort {
  readonly sessionId: string;
  readonly agentDir: string;
  readonly cwd: string;
  /** Advances on every session replacement and on delivery-only callback invalidation. */
  readonly sessionGeneration: number;
  /** Actual session replacements, excluding delivery-only invalidation of callbacks. */
  readonly sessionBindingGeneration: number;
  readonly disposed: boolean;
  currentSessionResumeMetadata(): OwnedUiSessionResumeMetadata | null;
}

/** The session lifecycle, its view, its event stream, and command admission. */
export interface OwnedUiSessionPort {
  start(): Promise<OwnedUiSessionViewModel>;
  view(): OwnedUiSessionViewModel;
  snapshot(): OwnedUiSnapshot;
  /** Subscribe to events; the listener first receives the current view. Returns the unsubscribe. */
  onEvent(listener: (event: OwnedUiEvent) => void): () => void;
  execute(command: OwnedUiCommand): Promise<OwnedUiCommandResult>;
  /** Settle queued delivery; rejects when required delivery was interrupted. */
  flushEvents(): Promise<void>;
  dispose(): Promise<void>;
}

/** Slash-command workflows and the shell-side host their interactive steps call back into. */
export interface OwnedUiWorkflowPort {
  executeWorkflow(request: OwnedUiWorkflowRequest): Promise<OwnedUiWorkflowResult>;
  executeBashWorkflow(command: string, excludeFromContext: boolean): Promise<OwnedUiBashWorkflowResult>;
  cycleModelWorkflow(direction: "forward" | "backward"): Promise<OwnedUiWorkflowResult>;
  workflowAutocompleteCommands(): readonly OwnedUiWorkflowAutocompleteCommand[];
  /** Clear queued steering and follow-up submissions, returning their texts in order. */
  clearQueuedWorkflows(): readonly string[];
  /** The result a blocked `/reload` reported, or null when reload is available. */
  reloadBlockedResult(): OwnedUiWorkflowResult | null;
  /** Copy through the active clipboard owner; true means acknowledged delivery. */
  copyWorkflowText(text: string): Promise<boolean>;
  setWorkflowInteractionHost(interaction: OwnedUiWorkflowInteractionHost): void;
}

/**
 * Engine settings the shell reads and the live effects it installs. Settings writes stay here
 * rather than in `OwnedUiCommand`: commands are admitted per session, and a global default must
 * not be gated by one session's admission or overload state.
 */
export interface OwnedUiSessionSettingsPort {
  readonly productMode: OwnedUiSessionProductMode;
  snapshot(): OwnedUiSessionSettingsSnapshot;
  /** Bind live effects for one owner; returns the unbind. */
  bindOwner(owner: OwnedUiSettingOwner, handlers: OwnedUiSettingOwnerHandlers): () => void;
  /** Persist the global thinking default without changing the live session level. */
  setDefaultThinkingLevel(level: OwnedUiSettingsThinkingLevel): void;
  /**
   * The theme the engine is configured with, in the engine's own grammar: a theme's name, or a
   * `light/dark` pair meaning "follow the terminal".
   */
  configuredTheme(): string | undefined;
}

/** Models, scopes, project trust, and authentication choices. */
export interface OwnedUiSessionCatalogPort {
  modelsContext(): OwnedUiModelsContext;
  setSessionModelScope(scopeIds: readonly string[]): void;
  persistModelScope(scopeIds: readonly string[]): void;
  refreshModels(signal: AbortSignal): Promise<OwnedUiModelsRefreshResult>;
  pinnedScopedModelsContext(): OwnedUiScopedModelsContext;
  updateScopedModels(enabledModelIds: readonly string[] | null): void;
  persistScopedModels(enabledModelIds: readonly string[] | null): void;
  refreshScopedModels(signal: AbortSignal): Promise<OwnedUiScopedModelsRefreshResult>;
  pinnedProjectTrustContext(): OwnedUiProjectTrustContext;
  persistProjectTrust(updates: readonly OwnedUiProjectTrustUpdate[]): void;
  pinnedLoginOptions(authType?: "oauth" | "api_key"): readonly OwnedUiAuthenticationProviderOption[];
  pinnedLoginMethodOptions(providerReference: string): { readonly title: string; readonly options: readonly OwnedUiWorkflowOption[] };
  pinnedAmbientAuthentication(selection: string): OwnedUiAmbientAuthentication | null;
  pinnedLogoutOptions(): Promise<readonly OwnedUiAuthenticationProviderOption[]>;
  pinnedForkOptions(): readonly OwnedUiWorkflowOption[];
}

/** Loaded resources, the extension UI bridge, transcript images, and clipboard binding. */
export interface OwnedUiExtensionPort {
  nonVisualResources(): readonly OwnedUiResourceSummary[];
  extensionResources(): readonly OwnedUiExtensionResourceSummary[];
  resolveTranscriptImage(assetId: string): OwnedUiImageAttachment | null;
  visualExtensionSupport(): OwnedUiVisualExtensionSupport;
  /** Attach the shell's extension UI and bind it to the current session. */
  bindExtensionUi(ui: OwnedUiExtensionUiPort, shutdown?: () => void | Promise<void>): Promise<void>;
  unbindExtensionUi(): Promise<void>;
  /** Bind the owned UI's clipboard lifecycle; true from the writer means acknowledged delivery. Returns the unbind. */
  bindClipboardWriter(writer: (text: string) => Promise<boolean>): () => void;
  /** Report a newer release found by the startup check. */
  announceReleaseUpdate(release: OwnedUiReleaseUpdate): void;
}

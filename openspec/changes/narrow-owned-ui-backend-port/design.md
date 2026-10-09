## Context

Second of eight preparatory changes for multi-agent tabs; depends on `multi-agent-prep-hygiene` being merged so the shell files carry no unused imports. Evidence gathered on `develop` at `337ad3e7`.

Every `backend.*` call in `session-shell.ts`, `session-shell-root.ts`, and `src/composition` was mapped. The forty-nine members group as follows.

| Group | Members | Payload types |
|---|---|---|
| identity | `sessionId`, `agentDir`, `cwd`, `sessionGeneration`, `sessionBindingGeneration`, `disposed`, `currentSessionResumeMetadata` | strings, numbers, `PiSessionResumeMetadata` (plain) |
| session | `start`, `view`, `snapshot`, `onEvent`, `execute`, `flushEvents`, `dispose` | already `OwnedUi*` |
| workflows | `executeWorkflow`, `executeBashWorkflow`, `cycleModelWorkflow`, `workflowAutocompleteCommands`, `clearQueuedWorkflows`, `reloadBlockedResult`, `copyWorkflowText`, `setWorkflowInteractionHost` | `PiWorkflowRequest`, `PiWorkflowResult`, `PiBashWorkflowResult`, `PiWorkflowAutocompleteCommand`, `PiWorkflowInteractionHost` (all plain) |
| settings | `pinnedSettingsSnapshot`, `bindSettingsOwner`, `applyPinnedSettingValue`, `setDefaultThinkingLevel`, `settingsProductMode`, `settingsPort`, `configuredTheme` | `PiPinnedSettingsSnapshot`, `PiSettingOwnerHandlers` (plain, built on `AgentJsonValue`) |
| catalog | `modelsContext`, `setSessionModelScope`, `persistModelScope`, `refreshModels`, `pinnedScopedModelsContext`, `updateScopedModels`, `persistScopedModels`, `refreshScopedModels`, `pinnedProjectTrustContext`, `persistProjectTrust`, `pinnedLoginOptions`, `pinnedLoginMethodOptions`, `pinnedAmbientAuthentication`, `pinnedLogoutOptions`, `pinnedForkOptions` | `PiModelsContext`, `PiScopedModelsContext`, `PiProjectTrustContext`, `PiAuthenticationProviderOption`, `PiWorkflowOption` (all plain) |
| extensions | `nonVisualResources`, `extensionResources`, `resolveTranscriptImage`, `visualExtensionSupport`, `bindExtensionUi`, `unbindExtensionUi`, `bindClipboardWriter`, `announceReleaseUpdate` | `OwnedPiResourceSummary`, `OwnedPiExtensionResourceSummary` (plain); `bindExtensionUi(ui: unknown)` |
| pinned (transitional) | `pinnedModelSelectorContext`, `pinnedSessionSelectorContext`, `pinnedTreeSelectorContext`, `pinnedMessageRenderer`, `pinnedToolRenderers`, `pinnedShortcutDescriptions` | carry `unknown`, `SessionInfo`, or `Parameters<AgentSession[...]>`: Pi objects the shell only forwards |

The precedent already exists: `OwnedUiPromptSuggestionGeneratorPort` lives in `src/contracts/owned-ui/model.ts:65`, `PiEngineAdapter` declares `implements` on it at `adapter.ts:111`, and the shell's suggestion controller depends only on the port.

## Goals / Non-Goals

**Goals:** the shell and composition compile against an interface in `src/contracts/owned-ui`; the interface is implementable by a future per-tab or non-Pi backend; the adapter class is unchanged in behavior.

**Non-Goals:** moving the six Pi-typed courier members (next change); splitting `PiEngineAdapter` internally; changing event delivery, overload policy, or any `OwnedUiCommand` semantics; creating a fake backend for tests.

## Decisions

### One interface of sub-ports in the contract owner

```ts
export interface OwnedUiSessionBackend {
  readonly identity: OwnedUiSessionIdentityPort;
  readonly session: OwnedUiSessionPort;
  readonly workflows: OwnedUiWorkflowPort;
  readonly settings: OwnedUiSessionSettingsPort;
  readonly catalog: OwnedUiSessionCatalogPort;
  readonly extensions: OwnedUiExtensionPort;
  /** Transitional: Pi-typed presentation payloads; removed by extract-pi-session-presenters. */
  readonly pinned: OwnedUiPinnedPresentationPort;
}
```

Sub-ports keep the shell's call sites readable (`backend.workflows.run(...)`) and let the later tab host hand a presenter only the ports it needs. `src/contracts/owned-ui` may import nothing outside itself, so every moved type must be Pi-free; the table above confirms that for every group except `pinned`.

### The transitional pinned port declares its payloads as `unknown`

The contract declares the six signatures with `unknown` payloads exactly as the shell already sees them, so the contract stays Pi-free and no brand or widening is needed. The port is marked transitional and is deleted by the next change.

### Rename on move, do not duplicate

`PiWorkflowRequest` becomes `OwnedUiWorkflowRequest`, and so on, with a type alias left in `workflows.ts` for one change cycle so the engine's internal files need no edit here. `PINNED_PI_WORKFLOW_COMMAND_NAMES` and `PINNED_PI_HIDDEN_COMMAND_NAMES`, imported by the root, move with them as `OWNED_UI_WORKFLOW_COMMAND_NAMES` and `OWNED_UI_HIDDEN_COMMAND_NAMES`.

### Fold duplicated settings paths

The shell reaches thinking level through `execute({ type: "set-thinking-level" })` in one place and `setDefaultThinkingLevel()` in another; `applyPinnedSettingValue()` overlaps `set-setting`. Both imperative methods are replaced by commands so the settings sub-port is `snapshot()`, `bindOwner()`, `productMode`, and the two composition-only getters.

## Risks / Trade-offs

- `exactOptionalPropertyTypes` and `verbatimModuleSyntax` make type-only moves noisy; move whole files rather than individual declarations where possible.
- Composition's `createPiAdapter` option returns `Promise<PiEngineAdapter>`; it should change to return the interface. If a class-only member remains in composition, record which and why in the acceptance list.
- The startup graph baseline counts files; moving types into new contract files must stay within `maximumFiles`.

## Planned Evidence

Type check; `npm run check:architecture`; the full `test/app/session-shell`, `test/integrations/pi/engine`, `test/composition`, and `test/contracts/owned-ui` owners; a new contract test asserting `PiEngineAdapter` is assignable to `OwnedUiSessionBackend`; strict OpenSpec validation.

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

Sub-ports keep the shell's call sites readable (`backend.workflows.executeWorkflow(...)`) and let the later tab host hand a presenter only the ports it needs. `src/contracts/owned-ui` may import nothing outside itself, so every moved type must be Pi-free; the table above confirms that for every group except `pinned`.

### The transitional pinned port declares its payloads as `unknown`

The contract declares the pinned signatures with `unknown` payloads, so the contract stays Pi-free and no brand or widening is needed. The port is marked transitional and is deleted by the next change. The adapter exports `PiPinnedPresentationPort`, which restates those members with their Pi types; the shell narrows to it in one private getter, the only place it forwards Pi payloads to Pi components.

Implementation moved three more Pi couriers onto this port, which therefore has nine members rather than six:

- `bindExtensionUi(ui)`: the shell passes a pinned `ExtensionUIContext`, which is not assignable to the contract's `OwnedUiExtensionUiPort` (its factory signatures take Pi's `TUI` and `Theme`). The payload is a Pi object, so the member is a courier.
- `pinnedSettingsModels()`: the settings snapshot's `currentModel` and `availableDefaultModels` are opaque Pi model objects that only the pinned settings selector reads. They leave the neutral snapshot and travel here.
- `applyPinnedSettingValue(callback, value)`: see the next decision.

### Rename on move, do not duplicate

`PiWorkflowRequest` becomes `OwnedUiWorkflowRequest`, and so on, with a type alias left in `workflows.ts` for one change cycle so the engine's internal files need no edit here. `PINNED_PI_WORKFLOW_COMMAND_NAMES` and `PINNED_PI_HIDDEN_COMMAND_NAMES`, imported by the root, move with them as `OWNED_UI_WORKFLOW_COMMAND_NAMES` and `OWNED_UI_HIDDEN_COMMAND_NAMES`.

### Settings writes stay off the command protocol

The plan was to fold `setDefaultThinkingLevel()` and `applyPinnedSettingValue()` into the `set-thinking-level` and `set-setting` commands. Implementation showed the two paths are not duplicates, and folding them would weaken the port:

- `set-thinking-level` changes the live session's level. `setDefaultThinkingLevel` persists the global default without touching the session, and accepts `max`, which `OwnedUiThinkingLevel` and the command validator reject. Folding needs a new scope field and a widened level enum, both changes to `OwnedUiCommand` semantics.
- `OwnedUiCommand` admission is per session: it is rejected while that session's delivery is overloaded, its admission is stopped, or 32 commands and workflows are pending. With one backend per tab, a global default or engine setting must not be refused because one tab is busy.
- Routing the settings selector through dispatch would emit accepted/completed events and a view refresh per change, including every theme preview step, and would surface failures as `engine-command` error diagnostics instead of the current workflow failure line.

So the settings sub-port keeps `setDefaultThinkingLevel(level)`, typed with the contract's `OwnedUiSettingsThinkingLevel` (`OwnedUiThinkingLevel | "max"`). `applyPinnedSettingValue` moves to the pinned port, because its job is to relay the pinned settings selector's callback name and `unknown` value. When extract-pi-session-presenters replaces that selector, it can give the port a typed setting write. The settings sub-port is `productMode`, `snapshot()`, `bindOwner()`, `setDefaultThinkingLevel()`, and `configuredTheme()`.

### Composition keeps one class-level member

`createPiAdapter` now returns `ComposedSessionBackend`, declared in `src/composition/owned-ui.ts` as `OwnedUiSessionBackend & OwnedUiPromptSuggestionGeneratorPort` plus `settingsPort()`. `settingsPort()` returns the agent-engine `AgentSettingsPort` that `OwnedSettingsManager` consumes, and `src/contracts/owned-ui` may not import `src/contracts/agent-engine`. It is the only adapter member composition reaches outside the owned-UI port.

### The application layer may not name the adapter class

`inspectLayerBoundaries` reports any `src/app` file that names `PiEngineAdapter` in an import clause or an inline `import("…").PiEngineAdapter` type. The shell may still import other engine types, such as `PiPinnedPresentationPort` and `workflowCommandNames`.

### Sub-ports delegate at call time

The adapter builds each sub-port once in its constructor; every member reads adapter state or a private collaborator when called, so a port obtained before a session replacement keeps working afterward. The adapter's flat public members stay for engine tests and internal callers. Shell tests that stubbed flat members now stub the sub-port member the shell calls, because some sub-port members reach collaborators directly.

## Risks / Trade-offs

- `exactOptionalPropertyTypes` and `verbatimModuleSyntax` make type-only moves noisy; move whole files rather than individual declarations where possible.
- Composition's `createPiAdapter` option returns `Promise<PiEngineAdapter>`; it should change to return the interface. If a class-only member remains in composition, record which and why in the acceptance list.
- The startup graph baseline counts files; moving types into new contract files must stay within `maximumFiles`.

## Planned Evidence

Type check; `npm run check:architecture`; the full `test/app/session-shell`, `test/integrations/pi/engine`, `test/composition`, and `test/contracts/owned-ui` owners; a new contract test asserting `PiEngineAdapter` is assignable to `OwnedUiSessionBackend`; strict OpenSpec validation.

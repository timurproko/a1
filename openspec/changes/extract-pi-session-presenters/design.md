## Context

Third of eight preparatory changes for multi-agent tabs; depends on `narrow-owned-ui-backend-port`. Evidence from `develop` at `337ad3e7`:

- `session-shell.ts:1099`, `:1301`, and `:1202` read `pinnedModelSelectorContext`, `pinnedSessionSelectorContext`, and `pinnedTreeSelectorContext` and spread them into `createPiShellModelSelector`, `createPiShellSessionSelector`, and the lazy `createTree` from `src/integrations/pi/components`.
- `session-shell.ts:359-361` passes `pinnedMessageRenderer`, `pinnedToolRenderers`, and `pinnedShortcutDescriptions` into the root, which forwards them to transcript components.
- `shell-selectors-dialogs.ts:145`, `:263-264`, and `lazy-selectors.ts:24` declare the receiving parameters with the same `unknown` and `SessionInfo` types; both sides agree the shell is type-blind.
- `project-structure-policy.mjs:33-34` allows `pi-engine-adapter` to import only contracts and startup, and `pi-component-adapter` to import only contracts. Composition and the shell are the only owners that may import both.
- `showScopedModelsSelector` (`session-shell.ts:1582-1657`) and `showModelsDialog` (`:1660-1745`) duplicate an abort controller, a fifteen-second timeout, and refresh handling.

## Goals / Non-Goals

**Goals:** no `unknown`-typed or Pi-typed member remains on `OwnedUiSessionBackend`; the shell opens Pi selectors through a neutral presenter port; the new owner is the single place that knows both the engine adapter and the component adapter.

**Non-Goals:** redesigning any selector's behavior; moving the other selector presenters that already use plain payloads (they may follow later); adding tabs; changing the owner rules for existing owners.

## Decisions

### A new owner rather than a relaxed edge

Allowing `pi-component-adapter` to import `pi-engine-adapter` (or the reverse) would let any component reach engine state and would reintroduce the coupling the boundary was built to prevent. A narrow owner that imports both and exports a neutral port confines the coupling to one directory with its own tests.

Owner entry (new line in `PROJECT_OWNERS`):

```js
"pi-session-presenters": owner("pi-session-presenters", "foundation",
  "src/integrations/pi/session-presenters", "test/integrations/pi/session-presenters",
  ["owned-ui-contracts", "pi-engine-adapter", "pi-component-adapter"]),
```

`composition` adds `"pi-session-presenters"` to `mayImport`. The shell reaches the presenters only through the contract and receives them from composition, so it does not import the owner and its `mayImport` is unchanged. The presenters import nothing from `presentation-contracts`, so that edge is not declared.

### The port the shell sees

```ts
export interface OwnedUiDialogHost {
  readonly disposed: boolean;
  setInputSurface(surface: OwnedUiInputSurface | null): void;
  requestRender(): void;
  viewport(): { readonly columns: number; readonly rows: number };
  appendWorkflowStatus(text: string): void;
  appendWorkflowResult(result: OwnedUiWorkflowResult): void;
  runWorkflow(request: OwnedUiWorkflowRequest): Promise<OwnedUiCommandResult>;
  beginPresentationHold?(): () => void;
  switchTuiMode?(mode: "regular" | "fullscreen"): boolean;
}
export interface OwnedUiSessionPresenters {
  transcriptRenderers(): OwnedUiTranscriptRendererPort;
  openModelSelector(host: OwnedUiDialogHost, initialSearchInput?: string): void;
  openSessionSelector(host: OwnedUiDialogHost, onExit: () => void): Promise<void>;
  openTreeSelector(host: OwnedUiDialogHost, navigate: (entryId: string, skipSummaryPrompt: boolean) => void, initialSelectedId?: string): Promise<void>;
  openSettingsSelector(host: OwnedUiDialogHost): void;
  openModelsDialog(host: OwnedUiDialogHost, initialQuery?: string): void;
  openScopedModelsSelector(host: OwnedUiDialogHost): void;
}
```

The host gained four members over the first sketch, each replacing shell state a moved body read: `disposed` for the checks after the lazy tree import, `appendWorkflowResult` for the tree copy and models save failures, `runWorkflow` returning the shell's own `OwnedUiCommandResult`, and `switchTuiMode`, which only the comparison profile supplies (bare A1 is permanently fullscreen). `beginPresentationHold` is likewise supplied only by bare A1. The tree selector takes a `navigate` callback because completing a navigation can open the shell's summary prompt and reopen the selector, which stays in the shell.

`OwnedUiTranscriptRendererPort` wraps the three renderer lookups behind the names the root already uses (`getMessageRenderer`, `getToolRenderers`, `getShortcuts`). A contract cannot name a component-owner type, so renderers are typed `object | undefined`: opaque to the shell, never `unknown`, and validated by the component adapter as before. `getShortcuts` takes a plain keybinding record. `Parameters<AgentSession[...]>` disappears from the root, and the adapter keeps it only on its presentation source.

### All nine transitional members leave the backend

`narrow-owned-ui-backend-port` finished with nine members on the transitional `pinned` port, not the six this change first listed. The other three were `pinnedSettingsModels`, `applyPinnedSettingValue`, and `bindExtensionUi`. The spec requirement holds only if all nine go:

- The settings selector moves into the presenters as `openSettingsSelector`, so `pinnedSettingsModels` and `applyPinnedSettingValue` are read where the selector is built.
- `bindExtensionUi` returns to the `extensions` sub-port typed with the existing `OwnedUiExtensionUiPort` contract, which the engine already asserts at bind time. The component bridge publishes its context as that port, so the shell never holds a Pi `ExtensionUIContext`.

### The adapter keeps the Pi objects off its contract

`PiEngineAdapter` replaces the `pinned` getter and its public `pinned*` courier methods with one `presentationSource()` accessor returning `PiSessionPresentationSource`, which is not part of `OwnedUiSessionBackend`. The presenters take a `PiSessionPresenterBackend` (the backend plus that accessor) rather than the adapter class, so composition's `ComposedSessionBackend` and its test doubles satisfy it, and they read the source only when a presenter runs. `inspectLayerBoundaries` rejects `PiSessionPresentationSource` in `src/app` the way it rejects `PiEngineAdapter`.

### Composition wires it

`composeOwnedUi` calls `createPiSessionPresenters(backend)` and passes `presenters` in the shell options next to `engine`. Shell tests that exercise these selectors use the real presenters over the existing fake runtime, as the fixture does today for the adapter. The fixture's lazy-selector seam is handed to the presenters, since the tree selector now loads there; the thinking selector keeps loading in the shell.

### Merge the two models dialogs' plumbing

The abort controller, timeout, `disposed` and `timedOut` flags, and refresh-then-update sequence move into one private helper in the new owner used by both `openModelsDialog` and `openScopedModelsSelector`.

## Risks / Trade-offs

- The governance surface for a new owner is about eight files; the `archive-workspace-subsystem` change touched seventy-four for the inverse, so budget review time for policy files.
- `test/repository-governance/project-structure-policy.test.ts:14` pins the exact owner-id list; update it in the same commit as the policy.
- The lazy selector loader (`lazy-selectors.ts`) is imported by the shell; moving its use keeps the dynamic import so the startup graph is unchanged.

## Planned Evidence

Type check; `npm run check:architecture`; new tests under `test/integrations/pi/session-presenters` covering each presenter with the fake runtime; `test/app/session-shell` models, sessions, and tree cases unchanged in behavior; strict OpenSpec validation.

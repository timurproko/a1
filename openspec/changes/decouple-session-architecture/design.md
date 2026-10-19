# Design

## Context

See `proposal.md` for the measurements and the capability deltas for observable behavior.

The repository already has the right structural patterns; the god objects are where those patterns stop being applied:

- `src/app/session-shell/session-viewport-controller.ts` is a focused interaction controller the root delegates to. The `owned-ux-architecture` capability requires that shape for stateful interaction policy, but the root still owns transcript caches, dock chrome, workflow output, and extension state inline, and the presenter owns twelve orchestration concerns inline.
- `src/integrations/pi/engine/adapter.ts` already delegates to eleven sibling collaborators. What remains is a double-exposed API, a 90-line hand-built port object, and view-model state that collaborators mutate through closures.
- `native/terminal-host/src/core/server.rs` is a pure `step(state, event, now) -> Vec<Effect>` state machine with a seeded simulator in `core/sim`. `roles/server.rs` embeds it but keeps a parallel 34-field `RuntimeState` beside it, and `roles/attach.rs` has no core at all.

### Current mechanics that matter

- The presenter constructs the root with a 33-callback handlers bag and the Pi extension bridge with 25 callbacks. Those bags are the de facto interface between the two classes.
- On every session-generation change, the presenter's `#syncView` manually resets copy intent, waiting images, pending pastes, suggestions, program status, history, the login dialog, the extension bridge, the viewport, dialogs, the input surface, and workflow presentation.
- The root keeps `#renderedRows` (per block, per width) and `#documentLayouts` (per width) and clears them from more than fifteen sites. Its `render` method branches on `#customViewport` and so does nearly every other method.
- `run_attach` (1688 lines on `a7d7fe85`) holds all interaction state in function locals and works through nine local macros over those locals: `send_child_frames`, `send_input`, `request_view`, `shown`, `paint_current` (36 sites), `paint_strip`, `invoke_popup_action`, `apply_terminal_effect`, and `apply_commit`. The confirm-close prompt from the first plan is gone; closing now goes through `CloseFallback`. New since the first plan: a settings tab (`settings_shown`), a pending jump, `DeferredInput` that holds input while a view is pending, status-glyph debouncing and holds, and `AttachServerWriter`/`ServerIngress` for bounded server writes. Key, mouse, and paste paths still each resolve precedence between rename, popup, drag, and the pending view in their own order.
- `roles/server.rs` (6129 lines) bumps `registry.registry_revision`, clones the store and document, drops the lock, and calls `commit_registry` at 25 sites. Viewer fan-out repeats `client.viewed_tab == tab_id` 15 times, and 23 handlers build `ResultBody` frames inline. The holder-exit, holder-lost, and bridge-request paths each re-implement respawn and the restart budget. New since the first plan: controller transfers (`PendingControllerTransfer`, `complete_controller_transfer`) and per-client render lanes.
- Native tests run only in CI from this workstation, so every native step is validated by the `terminal-host` CI partitions, not locally.

## Goals / Non-Goals

**Goals:**

- Each concern owns its state, its reset on session replacement, and its disposal; no class holds state it does not act on.
- One layout strategy per render root instance; no mode flag consulted per method.
- One owner for every cache and every registry commit path.
- The attach client's interaction is a pure state machine that the existing simulator can drive.
- The architecture gate stops the recorded units from growing again.
- Every public contract, test fixture entry point, and wire message stays byte-identical.

**Non-Goals:**

- Splitting the second-tier units (`SettingsApp`, `PiTuiRuntimeAdapter`, `SupervisorServer`, `TranscriptViewport.compose`, `SessionViewportController.handlePreInput`, `PiWorkflowRunner.#performWorkflow`, `PromptSelectionInterceptor`, `run_holder`, `PresentationComposer::prepare`, and the command functions in `roles/entry.rs`). They enter the size baseline so they cannot grow; splitting them is later work.
- Changing module owners, the owner DAG, or any `index.ts` public surface beyond re-exports.
- Changing the resident wire protocol, the registry document, or credentials.
- Any user-visible behavior change.

## Out of scope

- Vendored sources under `src/integrations/pi/components/upstream/`.
- The Ghostty FFI binding, the strip renderer, protocol fixtures, and the release update and garbage-collection modules; they are long but single-purpose.

## Invariants

1. `OwnedUiSessionShellOptions` and the `OwnedUiSessionShell` and `OwnedUiSessionShellRoot` constructors keep their signatures, because every test fixture builds the shell through them.
2. `src/contracts/owned-ui/*` does not change.
3. The architecture gate's owner map does not change; every new file lands inside an existing owner's source root.
4. `check-architecture.mjs` passes at every commit, including zero cycles and the startup reachability baseline.
5. The resident wire message set, fields, and ordering do not change; `role_integration.rs` passes unchanged.
6. The presenter and root never gain a new callback in the handlers bag; new seams are typed ports.

## Decisions

### 1. A session-concern lifecycle contract replaces the reset hub

Define one small interface in `src/app/session-shell/session-concern.ts`: `bind()`, `onSessionReplaced(generation)`, `dispose()`. Each extracted concern implements it and owns the fields it resets. The presenter holds an ordered list and fans out `onSessionReplaced` from its event handler and `dispose` from `release`. `#syncView` keeps only view projection.

**Alternative considered:** an event emitter the concerns subscribe to. Rejected because ordering of resets matters (copy intent before pastes before input surface) and a list makes that order explicit and testable.

### 2. Extract presenter concerns as classes constructed by the presenter

- `dialog-coordinator.ts`: owns dialog id, source, handle, the one `close` closure, `showSelector`, `#syncDialog`, `#openOwnedRoute`, `#presentStartupRoute`. Removes seven reset copies and ten close copies.
- `prompt-submission.ts`: `submit`, `#submitWhenReady`, waiting images, queue and follow-up, `#execute`, `#guardSubmission`, `#recoverSubmission`, `#rememberInput`, image sidecars. Depends on the backend session port, the root's chip and history primitives, the history controller, and the resident-tab coordinator.
- `workflow-router.ts`: `runWorkflow` becomes a table keyed by command name mapping to a handler; `#holdReloadSurface`, `#slashCommand`, `#submitSkillPrompt`, the tree flow, and skills autocomplete install. The duplicated "remember, resume following, execute" sequence becomes one function.
- `login-interaction.ts`: the four workflow-login methods and the ambient-auth dialog.
- `resident-tab-coordinator.ts`: the presenter's resident cluster plus `bindResidentTabBridge` and `correlateResidentTabSubmission` from composition. Composition constructs it and passes it in through `OwnedUiShellEngineOptions.residentTab`, which keeps the options shape.
- `settings-bindings.ts`: the three `bindOwner` calls as a table from setting key to root setter.
- `session-lifecycle.ts`: `start`, warmups, `shutdown`, `release`, exit-text composition, stopped promises.
- `suggestion-surface.ts`: the reason ladder once, the controller adapter.

The presenter keeps the hosted-presenter port methods, view projection, and construction.

### 3. The root delegates to one `ShellLayout`

`shell-layout.ts` declares `render(frame)`, `layoutParts()`, `inputGeometryReady()`, `setOverlaySurfaces()`, and `dispose()`. `pinned-layout.ts` and `viewport-layout.ts` implement it; the root picks one in the constructor from `sessionLayout` and never reads the mode again. The viewport layout owns `#visibleViewportSnapshot`, the dock-only reuse decision, and the composition counters.

### 4. The transcript document is the only cache owner

`transcript-document.ts` owns `#transcript`, `#blocksById`, `#transcriptOrder`, `#renderedRows`, `#documentLayouts`, `#submittedPromptComposer`, and the block render count. Its API is `apply(block)`, `reset()`, `layout(width)`, `invalidate(reason)`, `mountOrder()`, and `exitRows()`. Every current clearing site becomes an `invalidate` call with a named reason, which makes the fifteen sites reviewable.

### 5. Root chrome and surfaces become components the root composes

`dock-chrome.ts` (status, footer, queued, notices, release banner, copy acknowledgement), `workflow-output.ts` (anchored workflow components and `appendWorkflowResult` dispatch), `extension-surface.ts` (header, footer, widgets, statuses, working message), `input-surface-switch.ts` (surface, coordination kind, dock-input reuse), and `shell-editor-factory.ts` (the 150 lines of editor closures). The root keeps `update(view)`, which fans out, and `render`, which calls the layout.

### 6. The engine adapter exposes ports only

`ports/identity.ts`, `ports/session.ts`, `ports/workflows.ts`, `ports/settings.ts`, `ports/catalog.ts`, `ports/extensions.ts`, and `ports/presentation.ts` are small classes over the collaborators. The adapter constructs them and exposes them through the existing getters; the flat methods and `#createPorts` are deleted. `view-state.ts` holds lifecycle, editor, status, terminal, active model, thinking level, and revision with named mutators; `session-events.ts` and `workflow-runner.ts` receive the state object instead of closures. `#perform` moves into `command-dispatch.ts` as a handler map; `#reconcileOverload` moves into `event-delivery.ts`.

Callers of the flat methods inside `src/` are composition and the session presenters, which already hold the ports; tests that call flat methods switch to the port.

### 7. `core::attach` is a pure state machine

```text
pub enum Mode { Idle, Popup(PopupMenu), Rename(RenameEditor), Drag(TabDrag) }
pub enum ViewTransition { Settled, Requested { tab_id, staged: Option<Vec<StripTab>>, pending_surface: Option<Surface>, deferred: DeferredInput } }
pub struct View { viewed, prompt_view, settings_shown, pending_jump, transition }
pub struct State { tabs, view, mode, hovered, failed_tab, close_fallback, notice, user_input_pending, registry_revision, pending_manual_name, glyph_hold, ... }
pub enum Event { Server(ServerMessage), Key(KeyEvent), Mouse(MouseEvent), Paste(String), Resize, FocusGained, FocusLost, Tick(now) }
pub enum Effect { Send(Message), Paint { clear: bool }, RestoreAndExit { hint_tabs: usize }, Fail(String) }
pub fn step(state: &mut State, event: Event, now: Duration) -> Vec<Effect>
```

Mode precedence is one `match` on `(mode, event)`. The `prompt_view`, pending-jump, deferred-input, and settings-tab handling become transitions of `View`. `roles/attach.rs` keeps the handshake, the reader threads, `OuterTerminal`, `OuterWriter`, `AttachServerWriter`, `TabBindings`, `TimeFormatWatch`, presentation composition, and the encoders, and runs a loop of receive, step, apply effects; the nine macros become effect handlers or core functions. `core/sim` gains an attach driver that feeds random server messages and input and asserts: at most one mode at a time, paint follows every state change, and no send after exit.

**Alternative considered:** splitting `run_attach` into helper functions over a struct of the same locals. Rejected because it keeps implicit modes and does not make the client simulable.

### 8. The server is split by role and its per-tab state moves into the core

`roles/server/mod.rs` keeps `RuntimeState` with peers, slots, gates, config, and the `core::server::State`; the per-tab fields (`surfaces`, `launches`, `holders_terminating`, `holders_starting`, `bridge_status_sequences`, `status_persist_*`) move into `core::server::TabState`. `attach.rs`, `holder.rs`, `bridge.rs`, `lifecycle.rs`, `standby.rs`, `controller.rs` (controller transfers and boundaries), and `registry.rs` hold their handlers. `RegistryTxn` (added in `roles/registry.rs` by the helper step) takes the lock, applies a closure, bumps the revision, clones, releases, and commits; the 25 sites become `txn.apply(|r| ...)`. `fanout_to_viewers(tab_id, frame)` replaces the 15 filters. `respawn_holder` and `restart_budget` replace the three duplicated blocks each. The recovery-slot wait and restart delay become `Effect::ArmTimer` from the core, so holder and bridge reader threads never sleep.

### 9. Composition constructs and returns

`session-runtime-registry.ts` is a class with `register(identity)`, `start()`, and `dispose()` holding the identity map, refresh chain, and timer. `startup-route.ts` builds the changelog route and release-note claim. The resident-tab coordinator (decision 2) takes the bridge state machine. `composeOwnedUi` becomes: resolve paths, build settings, build backend, build services, build presenter options, construct host and presenter, return. The forward references (`backend` read by settings, `presenter` read by hotkeys) are replaced by passing the constructed object after construction.

### 10. A size ratchet in the architecture gate

`config/baselines/size-ratchet.json` records, per unit, the current method and field count for TypeScript classes and the inclusive line count for TypeScript functions and methods and Rust functions, keyed by file and name (`<path>::<Class>`, `<path>::<Class>.<method>`, `<path>::<Type>::<fn>`). Vendored sources and Rust `#[cfg(test)]` code are not measured. `check-architecture.mjs` recomputes them and fails when any recorded count grows or when a new unit exceeds the thresholds (20 methods, 15 fields, 100 lines per function). An entry whose unit falls under every threshold must be removed, so the baseline only shrinks. The measurement is a brace-depth scan over source with strings, comments, and regular expressions masked; it lives in `scripts/governance/size-ratchet-policy.mjs` with a unit test, and a file that does not balance fails the gate instead of being mismeasured. `scripts/governance/update-size-ratchet.mjs` lowers and removes entries and never adds or raises one; `--seed` only creates the file.

The ratchet lands first, recording the counts on the branch's reconciled `develop`, not last. The two days between the first plan and this refresh showed why: with no gate, resident-tab fixes added 443 lines to `run_attach` while the plan sat in review. Each later step lowers the entries it shrinks in the same commit, and the final step removes the entries that fell below every threshold. A resident-tab fix that lands on `develop` during this change and has to grow a recorded unit raises that entry in its own PR with a stated reason; the ratchet makes growth visible and reviewed, not impossible.

**Alternative considered:** landing the ratchet last, at post-refactor counts. Rejected because the native units grew faster than the refactor could shrink them.

## Risks

- **Regressions in behavior the tests do not pin.** Mitigation: every step is one commit; each extracted unit gains a focused test before the old code is deleted; the existing 56 session-shell test files, 34 engine test files, and the native role integration suite run in CI on every push.
- **Native validation is CI-only here.** Mitigation: native steps are ordered after the TypeScript dedupe so their CI runs are not blocked on unrelated failures, and each native commit is pushed separately.
- **The handlers bag tempts new callbacks.** Mitigation: invariant 6 and a focused test that counts the bag's keys.
- **Lock reordering in the server.** `RegistryTxn` keeps the exact current order: mutate under lock, clone, release, commit. The helper has a test with a poisoned lock and a failing commit.

## Sequencing

Land in this order, one commit per numbered task section: 1 through 10. Step 1 is the size ratchet at current counts. Steps 2 and 3 are mechanical and reduce line count without moving behavior; 4 and 5 are the largest single decouplings; 6 and 7 depend on 4; 8 depends on 3; 9 and 10 depend on 7. Every step lowers the ratchet entries it shrinks.

Because the resident-tab code is still being fixed often, each native step (3, 5, 8) starts by merging current `origin/develop` and re-checking the counts and names in its task against the code. If a fix has changed a named function or macro, update the task text before editing code.

## Verification per decision

- Decisions 1, 2: `test/app/session-shell/session-shell*.test.ts`, new `test/app/session-shell/{dialog-coordinator,prompt-submission,workflow-router,resident-tab-coordinator,session-lifecycle}.test.ts`.
- Decisions 3, 4, 5: `test/app/session-shell/session-bottom-hover.test.ts`, `test/features/owned-ui/pi-*-parity-fixture.ts`, new `transcript-document.test.ts` and `shell-layout.test.ts`.
- Decision 6: `test/integrations/pi/engine/*`, new `ports.test.ts` and `view-state.test.ts`.
- Decisions 7, 8: `native/terminal-host/src/core/sim`, `tests/role_integration.rs`, new `core/attach.rs` unit tests, `RegistryTxn` tests.
- Decision 9: `test/composition/*`, new `session-runtime-registry.test.ts`.
- Decision 10: new `test/repository-governance/size-ratchet.test.ts`, and `check-architecture.mjs` green at every later step.

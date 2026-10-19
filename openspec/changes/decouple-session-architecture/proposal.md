## Why

Module boundaries in this repository are healthy: the owner graph is enforced, the import graph has no cycles, and vendor knowledge stays behind the Pi adapters. Inside a handful of modules, however, six units have grown into god objects that every feature now has to pass through. A sweep of all 646 production source files across TypeScript, JavaScript, and Rust measured them:

| Unit | Size | State | Coupling evidence |
|---|---|---|---|
| `run_attach` in `native/terminal-host/src/roles/attach.rs` | one 1688-line function (1245 when this change was first planned) | 116 mutable locals, 17 of them `Option` state | No mode type. Popup, rename, drag, failed-tab, close fallback, settings-shown, pending jump, deferred input, and the `prompt_view` transition are independent locals that can all be set at once, and the key, mouse, and paste paths each resolve their precedence in a different order. Nine local macros (`send_child_frames`, `send_input`, `request_view`, `shown`, `paint_current`, `paint_strip`, `invoke_popup_action`, `apply_terminal_effect`, `apply_commit`) stand in for functions over shared locals. |
| `native/terminal-host/src/roles/server.rs` | 6129 lines (5708 when first planned) | `RuntimeState` with 37 fields behind one mutex | 100 lock sites, 57 copies of the poison-error expression, 25 copies of bump-revision-then-commit, 15 viewer filters, 23 inline result frames, 18 `thread::sleep` calls. `serve_holder` is 745 lines, `serve_attach` 573, and `serve_bridge` 468. Restart and respawn are duplicated across the holder, bridge, and lifecycle handlers. Reader threads sleep inside recovery waits. |
| `OwnedUiSessionPresenter` in `src/app/session-shell/session-shell.ts` | 1964 lines | 94 methods, 71 private fields | 17 responsibility clusters. `#syncView` resets the state of eight other clusters on every session replacement, which is why that state has to live in one class. The constructor is 449 lines. Seven copies of the dialog reset, ten of the selector close closure, two of the suggestion reason ladder. |
| `OwnedUiSessionShellRoot` in `src/app/session-shell/session-shell-root.ts` | 1470 lines | 87 methods, 75 private fields | Two layout modes in one class; `#customViewport` is consulted in nearly every method. `#documentLayouts` is cleared from more than fifteen sites. The root and presenter talk through a 33-callback handlers bag plus a 25-callback extension bridge. |
| `PiEngineAdapter` in `src/integrations/pi/engine/adapter.ts` | 854 lines | 73 methods, 37 private fields | Every operation is exposed twice, as a flat method and again through a hand-built 90-line port object. View-model state is mutated from closures handed to the runtime and workflow runner. |
| `composeOwnedUi` in `src/composition/owned-ui.ts` | 693 lines (627 when first planned) | 39 imports | A 30-second session-runtime heartbeat with its own state, the whole resident-tab bridge state machine, release-notes logic, and forward references that resolve only after construction all live in the composition root. |

The cost is measurable: of the last 120 commits, 62 touched the presenter and 52 touched the root, and 33 touched both in the same commit. No governance gate limits class or function size today, so nothing stops the next feature from making this worse. Between 2026-10-17, when this change was first planned, and 2026-10-19 (`develop` at `a7d7fe85`), five resident-tab fixes (#792, #798, #801, #802, #808) grew `run_attach` by 443 lines, `serve_holder` by 92, and `serve_attach` by 106. The TypeScript units stayed within 1% of their planned sizes. The size ratchet therefore lands first, so the units stop growing while the decoupling proceeds.

A second tier of units is overgrown but single-purpose: `SettingsApp`, `PiTuiRuntimeAdapter`, `SupervisorServer`, `TranscriptViewport.compose`, `SessionViewportController.handlePreInput`, `PiWorkflowRunner.#performWorkflow`, `PromptSelectionInterceptor`, `run_holder` in `roles/holder.rs` (813 lines), `PresentationComposer::prepare` in `roles/presentation.rs`, and the command functions in `roles/entry.rs` (formerly `main.rs`). They are recorded in the size baseline this change introduces and are out of scope for splitting here.

## What Changes

- First, add a size ratchet baseline to the architecture gate, recorded at today's counts, so the recorded method, field, and function-length counts can only shrink from here on.
- Give the session presenter one dialog coordinator, one suggestion-reason classifier, and a declarative settings-applier table, removing the duplicated reset, close, and ladder code.
- Introduce a registry transaction helper, a viewer fan-out helper, and single respawn and restart-budget functions in the native server, replacing the duplicated blocks.
- Extract a transcript document from the shell root as the only owner of transcript blocks, order, the per-block render cache, and the per-width document layouts.
- Give the attach client a pure `core::attach` state machine with an explicit `Mode` enum (idle, popup, rename, drag) and a view sub-state that owns the requested view, pending jump, deferred input, and the settings tab. `roles/attach.rs` keeps only threads, terminal entry and restore, and wire I/O; the existing simulator harness exercises the core.
- Split the shell root's two layout modes behind one `ShellLayout` interface with pinned and viewport implementations, and extract dock chrome, workflow output, the extension surface, input-surface switching, and the editor factory.
- Replace the presenter's `#syncView` reset hub with a session-concern lifecycle contract, and move prompt submission, workflow routing, the login interaction host, resident-tab coordination, and session lifecycle into their own concern classes. The resident-tab coordinator absorbs the bridge state machine now in composition.
- Split `roles/server.rs` into per-role modules, migrate per-tab fields into the existing `core::server::State`, and replace reader-thread sleeps with the core's timer effect.
- Make the engine adapter's contract ports its only public surface, give its view-model an explicit state object with named mutators, and move the command switch and overload reconciliation into their owning collaborators.
- Reduce the composition root to construction by extracting a session-runtime registry and a startup-route builder, and lower the ratchet baseline to the post-refactor counts.

Every step is behavior-preserving. The public contracts in `src/contracts/owned-ui`, `OwnedUiSessionShellOptions`, and the resident wire protocol do not change; existing tests remain the safety net.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `owned-ux-architecture`: session concerns own their state, reset, and disposal; render roots delegate to one layout strategy and own no caches; the composition root constructs and returns.
- `project-structure-governance`: the architecture gate enforces a shrinking size baseline for TypeScript classes and Rust functions.
- `resident-terminal-host`: the attach client's interaction is a pure state machine; registry commits and viewer fan-out go through one path; role reader threads never block on recovery waits.

## Impact

- **Session shell:** `src/app/session-shell/*` gains focused files for the transcript document, layouts, dock chrome, workflow output, extension surface, input surface, editor factory, dialog coordinator, prompt submission, workflow router, login interaction, resident-tab coordinator, session lifecycle, and settings bindings. `session-shell.ts` and `session-shell-root.ts` shrink to coordinators.
- **Engine adapter:** `src/integrations/pi/engine/adapter.ts` loses its flat method surface and `#createPorts`; new `ports/` and `view-state.ts` files; `command-dispatch.ts` and `event-delivery.ts` absorb logic.
- **Composition:** `src/composition/owned-ui.ts` shrinks; new `session-runtime-registry.ts` and `startup-route.ts`.
- **Native host:** `native/terminal-host/src/core/attach.rs` is new; `roles/attach.rs` shrinks; `roles/server.rs` becomes `roles/server/{mod,attach,holder,bridge,lifecycle,standby,controller,registry}.rs`; `core/server.rs` gains per-tab fields; `core/sim` gains attach coverage.
- **Governance:** `scripts/governance/check-architecture.mjs` gains a size-ratchet check reading `config/baselines/size-ratchet.json`.
- **Tests:** existing suites under `test/app/session-shell`, `test/integrations/pi/engine`, `test/composition`, and `native/terminal-host/tests` stay green; new focused tests cover each extracted unit and the ratchet.
- **Protocols and dependencies:** none change. No new runtime dependency.

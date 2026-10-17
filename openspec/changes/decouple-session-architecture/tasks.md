# Tasks

Each numbered section is one Implementation item of the pull request and one commit, landed in order. Read `design.md` "Current mechanics" and "Invariants" before editing; every task names the files it may touch, and a file not named is out of scope for that task. Before each push run `npm run typecheck`, the test files the task names, and `openspec validate decouple-session-architecture --strict`; native tasks are validated by the terminal-host CI partitions.

## 1. Presenter dedupe

- [ ] 1.1 Add `src/app/session-shell/dialog-coordinator.ts` owning dialog id, source, handle, the single `close` closure, `showSelector`, `#syncDialog`, `#openOwnedRoute`, and `#presentStartupRoute`; replace the seven inline reset copies and ten close copies in `session-shell.ts` with calls to it. Test: `test/app/session-shell/dialog-coordinator.test.ts` covers route, local, and backend sources, startup-route timing, and reset on session replacement.
- [ ] 1.2 Add `src/app/session-shell/suggestion-surface.ts` with one reason classifier replacing the two inline ladders and the inline controller adapter in `session-shell.ts`. Test: `test/app/session-shell/suggestion-surface.test.ts` covers every block reason and the identity literal.
- [ ] 1.3 Add `src/app/session-shell/settings-bindings.ts` expressing the terminal, shell, and shutdown owner appliers as a table from setting key to root setter, bound by one function; `session-shell.ts` calls it from the constructor. Test: `test/app/session-shell/settings-bindings.test.ts` covers every key, unbind order, and that no applier runs after release.
- [ ] 1.4 Collapse the five `{getColumns, getRows, requestRender}` literals in `session-shell.ts` into one `componentRuntime(terminal)` helper in `shell-host.ts`.

## 2. Native server registry and fan-out helpers

- [ ] 2.1 Add `RegistryTxn` to `native/terminal-host/src/roles/registry.rs` (lock, apply closure, bump revision, clone, release, commit) and replace all 25 bump-and-commit sites in `roles/server.rs`; one `poisoned()` helper replaces the 55 inline poison expressions. Tests: unit tests for a poisoned lock, a failing commit, and revision monotonicity.
- [ ] 2.2 Add `fanout_to_viewers(locked, tab_id, frame)` in `roles/server.rs` replacing the nine viewer filters, and `attach_frames_for(tab_id)` replacing the five duplicated subscription, visibility, and attachment pushes.
- [ ] 2.3 Add `respawn_holder(state, tab_id, reason)` and `restart_budget(record, now)` in `roles/server.rs` replacing the three duplicated respawn dispatches and the two `decide_restart` blocks; the explicit-restart bodies in `handle_lifecycle` and `serve_bridge` call one `request_child_restart`. Tests: `tests/role_integration.rs` unchanged and green; new unit tests for budget exhaustion and respawn failure release.
- [ ] 2.4 Add `reply_result(peer, request, accepted, message)` replacing the inline `ResultBody` frames across the handlers.

## 3. Transcript document

- [ ] 3.1 Add `src/app/session-shell/transcript-document.ts` owning blocks, order, per-block render cache, per-width document layouts, the submitted-prompt composer, and the render count, with `apply`, `reset`, `layout`, `invalidate(reason)`, `mountOrder`, and `exitRows`; `session-shell-root.ts` routes every former cache-clearing site through `invalidate` with a named reason. Test: `test/app/session-shell/transcript-document.test.ts` covers block replacement, width eviction to two entries, workflow anchors, live tail start, and every invalidate reason.
- [ ] 3.2 Move `#renderDocumentLayout` and `#blockRows` from the root into the document, keeping `shell-presenters-transcript.ts` as the renderer. Tests: `test/features/owned-ui/pi-static-parity-fixture.ts` and `pi-startup-fixture.ts` unchanged and green.

## 4. Attach client core

- [ ] 4.1 Add `native/terminal-host/src/core/attach.rs` with `State`, `Mode`, `ViewTransition`, `Event`, `Effect`, and `step`; move `PopupMenu`, `RenameEditor`, `TabDrag`, `CloseFallback`, and the pure helpers (`adopt_initial_surface`, `rejection_notice`, `failure_applies`, `prompt_overlay_notice`) from `roles/attach.rs` into it. Tests: unit tests for every server message arm, key, mouse, paste, resize, and focus event, and for mode exclusivity.
- [ ] 4.2 Reduce `run_attach` in `roles/attach.rs` to handshake, reader threads, `OuterTerminal`, `TabBindings`, `TimeFormatWatch`, and a loop of receive, `step`, apply effects; `paint_current!` and `invoke_popup_action!` are deleted. Tests: the existing `attach.rs` unit tests pass against the core; `tests/role_integration.rs` unchanged and green.
- [ ] 4.3 Add an attach driver to `native/terminal-host/src/core/sim/mod.rs` that feeds seeded server messages and input and asserts one mode at a time, a paint after every state change, and no send after exit.

## 5. Shell root layouts and surfaces

- [ ] 5.1 Add `src/app/session-shell/shell-layout.ts` (interface), `pinned-layout.ts`, and `viewport-layout.ts`; the root picks one in its constructor and removes every `#customViewport` read. The viewport layout owns the visible snapshot, dock-only reuse, and composition counters. Tests: `test/app/session-shell/session-bottom-hover.test.ts` green; new `shell-layout.test.ts` covers part order, dock-only reuse, and geometry readiness per layout.
- [ ] 5.2 Add `dock-chrome.ts`, `workflow-output.ts`, `extension-surface.ts`, and `input-surface-switch.ts` under `src/app/session-shell/`, each owning its fields from the root; the root's `update(view)` fans out and `invalidate` delegates. Tests: new focused tests per file; `test/app/session-shell/session-shell*.test.ts` green.
- [ ] 5.3 Move the editor construction closures from the root constructor into `src/app/session-shell/shell-editor-factory.ts`. Test: `test/app/session-shell/editor-hyperlink-budget.test.ts` and `paste-chip-lifecycle.test.ts` green.

## 6. Presenter concerns and lifecycle fan-out

- [ ] 6.1 Add `src/app/session-shell/session-concern.ts` (`bind`, `onSessionReplaced`, `dispose`); the presenter holds an ordered list, fans out replacement from its event handler and disposal from `release`, and `#syncView` keeps only view projection. Test: `test/app/session-shell/session-concern.test.ts` covers fan-out order and idempotent dispose.
- [ ] 6.2 Add `prompt-submission.ts`, `workflow-router.ts` (table keyed by command name, one remember-follow-execute function), and `login-interaction.ts` under `src/app/session-shell/`, each a session concern; delete the corresponding presenter methods. Tests: new focused tests per file; `test/app/session-shell/session-shell.test.ts` and `session-shell-models.test.ts` green.
- [ ] 6.3 Add `src/app/session-shell/resident-tab-coordinator.ts` absorbing the presenter's resident cluster and `bindResidentTabBridge` and `correlateResidentTabSubmission` from `src/composition/owned-ui.ts`; composition constructs it and passes it through the existing `residentTab` option. Tests: `test/composition/*` green; new `resident-tab-coordinator.test.ts` covers auto-name, rename, route, stop, status derivation, and stall timer.
- [ ] 6.4 Add `src/app/session-shell/session-lifecycle.ts` owning start, warmups, shutdown, release, exit text, and stopped promises; `session-shell.ts` keeps the hosted-presenter port, view projection, and construction. Test: `test/app/session-shell/session-shell-lifecycle.test.ts` green.

## 7. Server split and per-tab core state

- [ ] 7.1 Split `native/terminal-host/src/roles/server.rs` into `roles/server/{mod,attach,holder,bridge,lifecycle,standby,registry}.rs` with no logic change; `mod.rs` keeps `RuntimeState`, `run_server_child`, `serve_peer`, and supervision. Tests: `tests/role_integration.rs` unchanged and green.
- [ ] 7.2 Move `surfaces`, `launches`, `holders_terminating`, `holders_starting`, `bridge_status_sequences`, `status_persist_pending`, and `status_last_persist` into `core::server::TabState`; handlers read them through `locked.core`. Tests: `core/sim` green; `core/server.rs` unit tests cover the moved fields.
- [ ] 7.3 Replace `thread::sleep` and the blocking recovery-slot wait in the holder and bridge handlers with `Effect::ArmTimer` from `core::server::step`, handled by the supervision tick. Tests: role integration restart and recovery cases green; new unit test that a reader thread processes input during a restart delay.

## 8. Engine adapter ports and view state

- [ ] 8.1 Add `src/integrations/pi/engine/ports/{identity,session,workflows,settings,catalog,extensions,presentation}.ts`; `adapter.ts` constructs them, exposes them through the existing getters, and deletes the flat methods and `#createPorts`. Tests: `test/integrations/pi/engine/*` updated to call ports; new `ports.test.ts`.
- [ ] 8.2 Add `src/integrations/pi/engine/view-state.ts` with named mutators; `session-events.ts` and `workflow-runner.ts` receive it instead of closures; `adapter.ts` `view()` reads it. Test: `view-state.test.ts` covers every mutator and revision bump.
- [ ] 8.3 Move `#perform` into `command-dispatch.ts` as a handler map and `#reconcileOverload` into `event-delivery.ts`. Tests: `test/integrations/pi/engine/command-dispatch*.test.ts` and `event-delivery*.test.ts` green.

## 9. Composition root and size ratchet

- [ ] 9.1 Add `src/composition/session-runtime-registry.ts` (identity map, refresh chain, timer, `start`, `dispose`) and `src/composition/startup-route.ts` (changelog route and release-note claim); `composeOwnedUi` resolves, constructs, and returns with no forward references. Tests: `test/composition/*` green; new `session-runtime-registry.test.ts`.
- [ ] 9.2 Add `scripts/governance/size-ratchet-policy.mjs` and `config/baselines/size-ratchet.json` recording the current method, field, and line counts for every TypeScript class and Rust function above threshold; `check-architecture.mjs` fails when a recorded count grows, a new unit exceeds threshold, or an entry falls below every threshold without being removed. Test: `test/repository-governance/size-ratchet.test.ts` covers growth, new units, stale entries, and the scanner on fixtures.
- [ ] 9.3 Record the shell presenter, shell root, engine adapter, composition root, `run_attach`, and `roles/server` units at their post-refactor counts and the second-tier units at their current counts in `config/baselines/size-ratchet.json`; update `docs/architecture/boundaries.md` with the ratchet and the session-concern contract.

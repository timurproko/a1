# Tasks

Each numbered section is one Implementation item of the pull request and one commit, landed in order. Read `design.md` "Current mechanics" and "Invariants" before editing; every task names the files it may touch, and a file not named is out of scope for that task. Before each push run `npm run typecheck`, the test files the task names, and `openspec validate decouple-session-architecture --strict`; native tasks are validated by the terminal-host CI partitions. From section 2 on, every section also lowers the `config/baselines/size-ratchet.json` entries it shrinks.

Counts and names below were re-measured on `develop` at `a7d7fe85` (2026-10-19). Native sections 3, 5, and 8 begin by merging current `origin/develop` and re-checking their counts and names, because resident-tab fixes still land often in `roles/attach.rs` and `roles/server.rs`.

## 1. Size ratchet at current counts

- [x] 1.1 Add `scripts/governance/size-ratchet-policy.mjs` with the brace-depth scanner for TypeScript classes (method and field counts) and TypeScript functions and methods (line count) under `src/`, and Rust functions (line count) under `native/<crate>/src/`, excluding vendored sources and `#[cfg(test)]` code. Test: `test/repository-governance/size-ratchet.test.ts` covers the scanner on fixtures, growth, new units over threshold, and stale entries.
- [x] 1.2 Add `config/baselines/size-ratchet.json` recording every unit above threshold at its current counts, including `run_attach` (1688 lines), `serve_holder`, `serve_attach`, `serve_bridge`, `run_holder`, `PresentationComposer::prepare`, the `roles/entry.rs` command functions, the six first-tier units, and the TypeScript second tier; add `scripts/governance/update-size-ratchet.mjs` that can only lower or remove entries.
- [x] 1.3 Call the policy from `scripts/governance/check-architecture.mjs` so the gate fails when a recorded count grows, a new unit exceeds a threshold, or an entry falls below every threshold without being removed; document the gate and how a necessary raise is reviewed in `docs/architecture/boundaries.md`.

## 2. Presenter dedupe

- [x] 2.1 Add `src/app/session-shell/dialog-coordinator.ts` owning dialog id, source, handle, the single `close` closure, `showSelector`, `#syncDialog`, `#openOwnedRoute`, and `#presentStartupRoute`; replace the seven inline reset copies and ten close copies in `session-shell.ts` with calls to it. Test: `test/app/session-shell/dialog-coordinator.test.ts` covers route, local, and backend sources, startup-route timing, and reset on session replacement.
- [x] 2.2 Add `src/app/session-shell/suggestion-surface.ts` with one reason classifier replacing the two inline ladders and the inline controller adapter in `session-shell.ts`. Test: `test/app/session-shell/suggestion-surface.test.ts` covers every block reason and the identity literal.
- [x] 2.3 Add `src/app/session-shell/settings-bindings.ts` expressing the terminal, shell, and shutdown owner appliers as a table from setting key to root setter, bound by one function; `session-shell.ts` calls it from the constructor. Test: `test/app/session-shell/settings-bindings.test.ts` covers every key, unbind order, and that no applier runs after release.
- [x] 2.4 Collapse the `{getColumns, getRows, requestRender}` literals in `session-shell.ts` into one `componentRuntime(terminal)` helper in `shell-host.ts`.

## 3. Native server registry and fan-out helpers

- [x] 3.1 Add `lock_state` (one poisoned-lock error, replacing the 55 inline `.lock().map_err(...)` expressions), `bump_registry_revision` (the 25 bump sites), `registry_snapshot` (the 13 store-and-document clones), and `commit_staged` (the staged-commit blocks) to `roles/server.rs`, keeping every lock scope unchanged. Tests: unit tests for a poisoned lock, revision saturation, and an empty staged commit.
- [x] 3.2 Add `viewers` and `is_viewed` in `roles/server.rs` replacing the 12 single-condition `viewed_tab == tab_id` filters, and `offer_bridge_visibility` plus the existing `refresh_surface_subscription` replacing the duplicated visibility and subscription pushes in the attach and view handlers.
- [x] 3.3 Add `apply_restart_budget(record, now)` replacing the two `decide_restart` blocks, `holder_respawn` replacing the three respawn-order constructions, and `request_child_restart` replacing the explicit-restart bodies in `handle_lifecycle` and `serve_bridge`. Tests: `tests/role_integration.rs` unchanged and green in CI; new unit tests for budget exhaustion, window reset, and respawn tokens.
- [x] 3.4 Add `ResultBody::ok`, `accepted`, and `refused` in `roles/wire.rs` replacing 19 of the inline `ResultBody` literals; literals with a computed `accepted` stay explicit.

## 4. Transcript document

- [ ] 4.1 Add `src/app/session-shell/transcript-document.ts` owning blocks, order, per-block render cache, per-width document layouts, the submitted-prompt composer, and the render count, with `apply`, `reset`, `layout`, `invalidate(reason)`, `mountOrder`, and `exitRows`; `session-shell-root.ts` routes every former cache-clearing site through `invalidate` with a named reason. Test: `test/app/session-shell/transcript-document.test.ts` covers block replacement, width eviction to two entries, workflow anchors, live tail start, and every invalidate reason.
- [ ] 4.2 Move `#renderDocumentLayout` and `#blockRows` from the root into the document, keeping `shell-presenters-transcript.ts` as the renderer. Tests: `test/features/owned-ui/pi-static-parity-fixture.ts` and `pi-startup-fixture.ts` unchanged and green.

## 5. Attach client core

- [ ] 5.1 Add `native/terminal-host/src/core/attach.rs` with `State`, `View`, `Mode` (idle, popup, rename, drag), `ViewTransition`, `Event`, `Effect`, and `step`; move `PopupMenu`, `PopupItem`, `RenameEditor`, `TabDrag`, `CloseFallback`, `DeferredInput`, and the pure helpers (`failure_applies`, `rejection_notice`, `close_fallback_for`, `settings_toggle_closes`, `shown_tabs`, `debounce_starting_glyphs`, `hold_status_glyphs`, `registry_index`, `drag_destination`, `update_drag`, `forward_pointer_motion`, `holder_idle_precedes_bridge`) from `roles/attach.rs` into it. Tests: unit tests for every server message arm, key, mouse, paste, resize, and focus event, for the settings tab, pending jump, and deferred input, and for mode exclusivity.
- [ ] 5.2 Reduce `run_attach` in `roles/attach.rs` to handshake, reader threads, `OuterTerminal`, `OuterWriter`, `AttachServerWriter`, `TabBindings`, `TimeFormatWatch`, presentation composition, and a loop of receive, `step`, apply effects; delete the nine local macros (`send_child_frames`, `send_input`, `request_view`, `shown`, `paint_current`, `paint_strip`, `invoke_popup_action`, `apply_terminal_effect`, `apply_commit`). Tests: the existing `attach.rs` unit tests pass against the core; `tests/role_integration.rs` unchanged and green.
- [ ] 5.3 Add an attach driver to `native/terminal-host/src/core/sim/mod.rs` that feeds seeded server messages and input and asserts one mode at a time, a paint after every state change, and no send after exit.

## 6. Shell root layouts and surfaces

- [ ] 6.1 Add `src/app/session-shell/shell-layout.ts` (interface), `pinned-layout.ts`, and `viewport-layout.ts`; the root picks one in its constructor and removes every `#customViewport` read. The viewport layout owns the visible snapshot, dock-only reuse, and composition counters. Tests: `test/app/session-shell/session-bottom-hover.test.ts` green; new `shell-layout.test.ts` covers part order, dock-only reuse, and geometry readiness per layout.
- [ ] 6.2 Add `dock-chrome.ts`, `workflow-output.ts`, `extension-surface.ts`, and `input-surface-switch.ts` under `src/app/session-shell/`, each owning its fields from the root; the root's `update(view)` fans out and `invalidate` delegates. Tests: new focused tests per file; `test/app/session-shell/session-shell*.test.ts` green.
- [ ] 6.3 Move the editor construction closures from the root constructor into `src/app/session-shell/shell-editor-factory.ts`. Test: `test/app/session-shell/editor-hyperlink-budget.test.ts` and `paste-chip-lifecycle.test.ts` green.

## 7. Presenter concerns and lifecycle fan-out

- [ ] 7.1 Add `src/app/session-shell/session-concern.ts` (`bind`, `onSessionReplaced`, `dispose`); the presenter holds an ordered list, fans out replacement from its event handler and disposal from `release`, and `#syncView` keeps only view projection. Test: `test/app/session-shell/session-concern.test.ts` covers fan-out order and idempotent dispose.
- [ ] 7.2 Add `prompt-submission.ts`, `workflow-router.ts` (table keyed by command name, one remember-follow-execute function), and `login-interaction.ts` under `src/app/session-shell/`, each a session concern; delete the corresponding presenter methods. Tests: new focused tests per file; `test/app/session-shell/session-shell.test.ts` and `session-shell-models.test.ts` green.
- [ ] 7.3 Add `src/app/session-shell/resident-tab-coordinator.ts` absorbing the presenter's resident cluster and `bindResidentTabBridge`, `correlateResidentTabSubmission`, and the tab-shortcut publishing from `src/composition/owned-ui.ts`; composition constructs it and passes it through the existing `residentTab` option. Tests: `test/composition/*` green; new `resident-tab-coordinator.test.ts` covers auto-name, rename, route, stop, status derivation, shortcut publishing, and stall timer.
- [ ] 7.4 Add `src/app/session-shell/session-lifecycle.ts` owning start, warmups, shutdown, release, exit text, and stopped promises; `session-shell.ts` keeps the hosted-presenter port, view projection, and construction. Test: `test/app/session-shell/session-shell-lifecycle.test.ts` green.

## 8. Server split and per-tab core state

- [ ] 8.1 Split `native/terminal-host/src/roles/server.rs` into `roles/server/{mod,attach,holder,bridge,lifecycle,standby,controller,registry}.rs` with no logic change; `mod.rs` keeps `RuntimeState`, `run_server_child`, `serve_peer`, and supervision; `controller.rs` takes `PendingControllerTransfer`, `complete_controller_transfer`, and `expire_controller_boundaries`. Tests: `tests/role_integration.rs` unchanged and green.
- [ ] 8.2 Move `surfaces`, `launches`, `holders_terminating`, `holders_starting`, `bridge_status_sequences`, `status_persist_pending`, and `status_last_persist` into `core::server::TabState`; handlers read them through `locked.core`. Tests: `core/sim` green; `core/server.rs` unit tests cover the moved fields.
- [ ] 8.3 Replace `thread::sleep` and the blocking recovery-slot wait in the holder and bridge handlers with `Effect::ArmTimer` from `core::server::step`, handled by the supervision tick. Tests: role integration restart and recovery cases green; new unit test that a reader thread processes input during a restart delay.

## 9. Engine adapter ports and view state

- [ ] 9.1 Add `src/integrations/pi/engine/ports/{identity,session,workflows,settings,catalog,extensions,presentation}.ts`; `adapter.ts` constructs them, exposes them through the existing getters, and deletes the flat methods and `#createPorts`. Tests: `test/integrations/pi/engine/*` updated to call ports; new `ports.test.ts`.
- [ ] 9.2 Add `src/integrations/pi/engine/view-state.ts` with named mutators; `session-events.ts` and `workflow-runner.ts` receive it instead of closures; `adapter.ts` `view()` reads it. Test: `view-state.test.ts` covers every mutator and revision bump.
- [ ] 9.3 Move `#perform` into `command-dispatch.ts` as a handler map and `#reconcileOverload` into `event-delivery.ts`. Tests: `test/integrations/pi/engine/command-dispatch*.test.ts` and `event-delivery*.test.ts` green.

## 10. Composition root and final baseline

- [ ] 10.1 Add `src/composition/session-runtime-registry.ts` (identity map, refresh chain, timer, `start`, `dispose`) and `src/composition/startup-route.ts` (changelog route and release-note claim); `composeOwnedUi` resolves, constructs, and returns with no forward references. Tests: `test/composition/*` green; new `session-runtime-registry.test.ts`.
- [ ] 10.2 Lower the shell presenter, shell root, engine adapter, composition root, `run_attach`, and `roles/server` entries in `config/baselines/size-ratchet.json` to their post-refactor counts and remove the entries that fell below every threshold; update `docs/architecture/boundaries.md` with the session-concern contract.

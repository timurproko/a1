# Tasks

Each numbered section is one Implementation item and one commit, landed in order, each followed by a CI run and manual tab testing before the next. Every section starts by merging current `origin/develop` and re-checking the names below, and lowers the size-ratchet entries it shrinks. Native tests run only in CI from the maintainer's workstation.

## 1. Core attach input types

- [x] 1.1 Add `native/terminal-host/src/core/attach.rs` with sans-IO key, mouse, strip-hit, and strip-snapshot types, and conversions from crossterm and `roles::strip` in `roles/attach.rs`; no behavior change. Tests: unit tests for every conversion.

## 2. Attach interaction state into the core

- [x] 2.1 Move `PopupMenu`, `PopupItem`, `RenameEditor`, `TabDrag`, `CloseFallback`, `DeferredInput`, and the pure helpers (`failure_applies`, `rejection_notice`, `close_fallback_for`, `settings_toggle_closes`, `shown_tabs`, `debounce_starting_glyphs`, `hold_status_glyphs`, `registry_index`, `drag_destination`, `update_drag`, `forward_pointer_motion`, `holder_idle_precedes_bridge`) into `core::attach` over the core types. Tests: the existing `roles/attach.rs` unit tests pass against the core.

## 3. Attach state machine

- [x] 3.1 Add `State`, `View`, `Mode`, `ViewTransition`, `Event`, `Effect`, and `step` to `core::attach`, and reduce `run_attach` to handshake, reader threads, `OuterTerminal`, `OuterWriter`, `AttachServerWriter`, `TabBindings`, `TimeFormatWatch`, presentation composition, and a loop of receive, `step`, apply effects; delete the nine local macros. Tests: unit tests for every server message arm, key, mouse, paste, resize, and focus event, the settings tab, pending jump, deferred input, and mode exclusivity; `tests/role_integration.rs` unchanged and green.

## 4. Simulator attach driver

- [x] 4.1 Add an attach driver to `native/terminal-host/src/core/sim/mod.rs` that feeds seeded server messages and input and asserts one mode at a time, a paint after every state change, and no send after exit.

## 5. Per-tab server state in the core

- [x] 5.1 Move `holders_terminating`, `holders_starting`, `bridge_status_sequences`, `status_persist_pending`, and `status_last_persist` into a per-tab `core::server::TabRuntime` beside `core::server::TabState`; handlers read them through `locked.core`. `surfaces` and `launches` stay role-owned because they hold wire payloads the core must not depend on. Tests: `core/sim` green; `core/server.rs` unit tests cover the moved fields.

## 6. Timer-driven recovery waits

- [ ] 6.1 Replace `thread::sleep` and the blocking recovery-slot wait in the holder and bridge handlers with `Effect::ArmTimer` from `core::server::step`, handled by the supervision tick. Tests: role integration restart and recovery cases green; new unit test that a reader thread processes input during a restart delay.

## Why

`decouple-session-architecture` decoupled the session shell, engine adapter, composition root, and resident server helpers, and split `roles/server.rs` into role modules. Three native changes were moved here by maintainer decision on 2026-10-19, because they change attach interaction and server restart timing and need their own CI cycles and manual tab testing:

| Unit | Measured on `develop` `a7d7fe85` | Problem |
|---|---|---|
| `run_attach` in `native/terminal-host/src/roles/attach.rs` | one 1688-line function, 116 mutable locals, 9 local macros | No mode type: popup, rename, drag, failed tab, close fallback, settings tab, pending jump, deferred input, and the requested view are independent locals, and key, mouse, and paste paths each resolve precedence in their own order. Nothing can drive it in the simulator. |
| `RuntimeState` in `native/terminal-host/src/roles/server/mod.rs` | 37 fields behind one mutex | Per-tab fields (`surfaces`, `launches`, `holders_terminating`, `holders_starting`, `bridge_status_sequences`, `status_persist_pending`, `status_last_persist`) live beside `core::server::State` instead of in its `TabState`. |
| Holder and bridge reader threads | `thread::sleep` and a blocking recovery-slot wait | A reader thread stops processing its peer's frames during a restart delay or while waiting for a recovery slot. |

Both units are recorded in the size ratchet, so they cannot grow meanwhile.

## What Changes

- Give the attach client a pure `core::attach` state machine with an explicit `Mode` enum (idle, popup, rename, drag) and a view sub-state that owns the requested view, pending jump, deferred input, and the settings tab. The core gets its own key, mouse, and strip-hit types first, because today's popup, rename, and drag state depend on crossterm and strip rendering from the role layer.
- Reduce `run_attach` to the handshake, reader threads, outer terminal, bindings, settings observation, encoding, and a loop of receive, step, and apply effects; add an attach driver to the simulator.
- Move the per-tab runtime fields into `core::server::TabState`.
- Replace reader-thread sleeps and the blocking recovery-slot wait with `Effect::ArmTimer` from the server core, completed by supervision.

Every step is behavior-preserving for users; the resident wire protocol does not change.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `resident-terminal-host`: the attach client's interaction is a pure state machine; role reader threads never block on recovery waits.

## Impact

- **Native host:** new `native/terminal-host/src/core/attach.rs`; `roles/attach.rs` shrinks; `core/server.rs` gains per-tab fields; `roles/server/{holder,bridge,mod}.rs` stop sleeping; `core/sim` gains attach coverage.
- **Tests:** native unit tests and `tests/role_integration.rs` stay green in CI; new core unit tests and simulator coverage. Each step also needs manual testing of tab switching, menus, rename, drag, paste, and restart.
- **Protocols and dependencies:** none change.

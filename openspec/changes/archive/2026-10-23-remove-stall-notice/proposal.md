## Why

A resident tab that produces no model or tool progress for five minutes is reported as `stalled`: the session shell appends `No progress for 5 min — …` to the transcript, the chip shows a yellow `!`, and the attach client paints `Agent stalled · R restart · Alt+W close` under the strip, with a bare `R` that restarts the tab. A tab whose A1 event loop stops sending heartbeats (`unresponsive`) gets the same `!`, row, and `R` key. A stall is only advisory, because long tools are legitimate, and an unresponsive tab already restarts itself automatically, so these notices interrupt healthy work and offer actions that only lose the running turn. The maintainer rejected the dialog redesign in #816 in favor of removing the notices.

## What Changes

- Remove progress-stall detection from the session shell: no stall timer, no `stalled` status report, no `No progress` transcript line, and no `stallNoticeSeconds` launch value.
- Remove `stalled` as a tab status throughout the bridge, the resident server, its counters, and the attach client.
- Stop presenting `unresponsive` to clients: the chip keeps the status it had, no `!` appears, and no notice row is painted. The server keeps measuring heartbeat silence, records the `unresponsive` lifecycle and counter, and still restarts the tab automatically after 120 seconds.
- Retire the bare `R` restart key for stalled and unresponsive tabs; `R` reaches the tab as typed text. The failed-tab banner and its `R`/`F` keys are unchanged.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `resident-tab-reliability`: progress is no longer supervised for stalls, and liveness loss is handled by automatic restart without any user-facing indicator.
- `resident-terminal-host`: host status counters no longer include stalled transitions.

## Impact

- Session shell: `src/app/session-shell/resident-tab-coordinator.ts`, `session-shell-root.ts`, `src/composition/owned-ui.ts`, `src/foundation/resident-tabs/settings.ts`, `bridge-client.ts`, and their tests.
- Native terminal host: `roles/server/bridge.rs`, `roles/server/mod.rs`, `roles/counters.rs`, `core/server.rs`, `roles/strip.rs`, `roles/attach.rs`, `core/attach/machine.rs`, `core/sim/attach.rs`, and their tests.
- Documentation: `docs/architecture/resident-tabs.md`.
- Out of scope: heartbeat timing, the automatic unresponsive restart and its budget, the failed-tab banner, the `degraded` indicator, input-queue `not accepting input` rejection, and `a1 solo`.

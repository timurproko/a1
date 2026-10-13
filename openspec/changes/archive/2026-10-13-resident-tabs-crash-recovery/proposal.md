# Proposal

## Why

After milestones 2 and 3, a resident tab survives terminal closure and its failures stay inside the tab, but a tab whose A1 process dies just stops. The user kept crash recovery in the first version: a crashed tab must come back into its session, a submitted prompt must never be lost or resent, a draft must lose at most about a second of typing, and the evidence of what went wrong must survive without leaking conversation content into diagnostics. Reboot and logout restore were dropped, so this milestone also defines what happens instead: tabs end, and every session stays resumable. The design is in `docs/architecture/resident-tabs.md` (Decisions 8, 9, 12, 14, and 16).

This is milestone 4 of 6. It requires milestones 1 (`resident-tabs-contracts`, PR #586), 2 (`resident-tabs-persistent-tab`), and 3 (`resident-tabs-failure-isolation`) to be merged first. Everything stays behind `residentTabs: false`; with it off, bare `a1` behaves exactly as today.

## What Changes

- The server's I/O-free core gains a crash-restart policy: one start gate per tab, backoff of 1 s, 5 s, and 30 s, a budget of three restarts in ten minutes, then `failed` with retry, start-fresh, and close actions. The holder respawns `node bin/ui.js --tab --session <file>` on the server's instruction.
- The A1 tab child sends an event-loop heartbeat over the bridge. The server shows `unresponsive` after 30 s of silence and restarts the tab at `tabsUnresponsiveRestartSeconds` (default 120), counting silence only while the supervision path itself is healthy.
- The child reports `stalled` after `tabsStallNoticeSeconds` (default 300) without model or tool progress, with interrupt and restart actions. It is never killed automatically.
- A child-owned, owner-only prompt journal commits each submission durably, with a stable submission id and session identity, before dispatch. Recovery reconciles journal and session by identity, retires entries idempotently, covers the first turn before Pi creates its session file, and never resends. Asynchronous prompt history is not used as the barrier.
- Periodic draft checkpoints keep the dirty interval at or under one second during continuous typing, and show a degraded state when a checkpoint fails or runs late.
- The child synchronizes the Pi session file to stable storage after each settled turn and on graceful stop.
- The registry quarantines a corrupt file and loads the last good generation, fails closed when none is valid, retries transient rename failures, and rejects mutations on disk-full while keeping memory authoritative.
- The holder freezes the last screen as a read-only snapshot and writes an owner-only recovery file kept for seven days. Optional raw child stderr has a private bounded recovery sink and never enters diagnostics.
- Structured diagnostics are allowlisted and rotated, with distinct crash, watchdog, and unrequested-exit records.
- Reboot and logout: tabs are not restored. The server moves the previous tab set to registry history and starts one new tab. Sessions stay resumable through the picker, and a journaled prompt is offered when its session next opens in a tab within seven days.
- Failed tabs are presented in the minimal strip from milestones 2 and 3, with a banner over the read-only snapshot.
- Crash-point tests at every persistence step, a continuous-typing test, a ten-tab concurrent restart test, and a sensitive-stderr exclusion test, on Windows x64, macOS, and Linux.

## Capabilities

### New Capabilities

- `resident-tab-reliability`: liveness and progress supervision, per-class data durability, and failure-surviving diagnostics for resident tabs.
- `multi-agent-tabs`: per-tab presentation and recovery of tab failure.

### Modified Capabilities

- `resident-terminal-host`: adds bounded crash and hang restart, and the reboot and logout outcome. Milestone 1 creates this capability; this change only adds requirements to it.

## Impact

- `native/terminal-host`: restart policy, heartbeat supervision, and boot and OS-session handling in the core; snapshot and recovery-file writing in the holder; registry quarantine, rename retry, and disk-full handling in the server; structured log rotation and crash records; additive generation-1 messages with new frozen fixtures.
- Node tab child (`bin/ui.js --tab` and the tab-mode modules from milestone 2): prompt journal, draft checkpoints, session-file sync, bridge heartbeat, stall detection, and recovery offers in the session shell.
- Settings: `tabsUnresponsiveRestartSeconds` and `tabsStallNoticeSeconds`.
- New owner-only data under `<dataDir>/tabs/<profile-token>/<tabId>/`: `journal.jsonl`, `draft.json`, and `recovery/`.
- CI: crash-point, continuous-typing, concurrent-restart, and stderr-exclusion suites on all three platforms.
- No change when `residentTabs` is `false`, and no change to `a1 pi`.

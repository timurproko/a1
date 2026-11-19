## Why

Bare `a1` with resident tabs shows an empty terminal that only reacts to resizes when every Agent tab of the profile has stopped without being closed. The server starts the first Agent for an attach only when the registry is "agentless", and a stopped Agent record (`desired: stopped`, no holder) makes it not agentless, so `attach.start` starts nothing and admits the client to a stopped tab. The client paints neither a tab nor the landing, because the landing is shown only after tabs were shown once in that client. The user sees nothing until they stop the host by hand. Agent tabs reach this state after an update shuts the session down, after a crash, after the processes are killed, or after a reboot that recovery does not cover; on 2026-10-27 an interrupted automatic update left every tab stopped and each later `a1` came up blank until `a1 tabs host stop` cleared the records.

## What Changes

- When the attach handshake finds no running Agent, the server treats stopped Agent records without a holder as absent: it drops them from the registry and starts one new Agent in the client's launch cwd, exactly as it does for an empty profile, and the client views it with the same first-draw gate.
- When the attach client's first registry list carries no running tab and no create is pending, it presents the landing (strip with `+` and clock, wordmark, cwd, version) immediately instead of an empty body, so a profile whose first Agent cannot start still shows a usable shell with the `+` launcher and any failure notice.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `multi-agent-tabs`: an attach with only stopped Agent records starts a new Agent; a fresh attach with no running tab shows the landing rather than nothing.

## Impact

- **Native host, server:** `native/terminal-host/src/roles/server/lifecycle.rs` (`attach_start_tab`), `native/terminal-host/src/roles/server/mod.rs` (`agentless`, `default_tab`, stopped-record pruning).
- **Native host, client:** `native/terminal-host/src/roles/attach.rs` landing gate (`landing_shown`, `has_shown_tabs`) and its presentation tests; `native/terminal-host/tests/role_integration.rs` for the attach-after-all-stopped case.
- **Documentation:** `docs/architecture/resident-tabs.md` where the first Agent start is described.
- No TypeScript or dependency changes; `a1 solo`, `a1 pi`, standby promotion, and utility tabs are unchanged.

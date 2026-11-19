# Proposal

## Why

The `Resident tabs chaos` lane fails intermittently on `develop`-based branches with the same two violations: `host-stop` returns `accepted: false` with one tab left in `remaining` and nothing in `forced`, and the resident server is then reported as an orphaned process. On 2026-10-16 this happened on macOS for PR #777 and `fix/background-agent-rendering`, and on Windows for an earlier #777 run and `fix/tab-autonaming-animation`. None of these branches touch tab lifecycle code.

When the run ends, no holder or tab child is still alive, but the server's own bookkeeping still counts a tab as live: either its holder connection entry was not torn down, or its starting entry points at a recorded holder that is already dead. `host.stop` can only release a tab by terminating a verified holder, and a dead holder can't be verified, so that tab never leaves `remaining`. The stop is refused, the server keeps running, and every later check fails.

## What Changes

- `host.stop` releases a tab once it confirms that the tab's holder and recorded child are both gone, instead of waiting for a process it can no longer verify. Such a tab counts as stopped and its server bookkeeping is cleared.
- The `host.stop` result names the tabs it released this way, and for each tab still remaining it says why. A diagnostic event records each release.
- The chaos harness includes those reasons in its violation text, so a later failure names the branch it hit.
- Role-integration tests cover a holder that dies while it is unconnected or awaiting readmission after a server replacement, followed by `host-stop`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `resident-tab-reliability`: host stop completes when a tab's processes are already gone.

## Impact

- `native/terminal-host/src/roles/server.rs` (`host.stop` maintenance) and `native/terminal-host/tests/role_integration.rs`.
- `scripts/development/run-resident-chaos.mjs` violation text.
- No protocol generation change: the new result fields are additive.

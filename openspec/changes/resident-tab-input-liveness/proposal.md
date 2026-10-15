# Proposal

## Why

With several agents running in resident tabs, keyboard and mouse input can stop for every tab at once while their output keeps rendering. The resident server reads a terminal's keystrokes and mouse events on the same thread that runs that terminal's tab lifecycle requests, and `tab.create` waits for a start slot with no deadline (`acquire_start_permit`). Crash recovery holds start slots for up to 30 seconds each and only two exist by default, so a new tab requested while two tabs are restarting can park that thread indefinitely. Nothing else from the terminal is read until it returns. The existing requirement "Control paths never block on external work" already forbids this.

The attach client adds two smaller ways to lose input: one `failed` flag shared by every tab drops nearly all keys after any viewed tab fails until new output arrives, and the close-confirmation and overflow prompts silently swallow keys after tab output has drawn over their notice.

## What Changes

- The server reads a terminal's input, paste, resize, focus claims, tab views, and tab lists on its connection thread and never runs tab lifecycle work there. Attach start, tab create, close, restart, rename, and reorder run in order on a per-connection lifecycle worker; a failure there is reported to the terminal instead of closing its connection.
- Waiting for a start slot has a deadline and fails with a visible `tab-start-busy` reason. Crash recovery yields free slots to a waiting interactive start, and the concurrent-start limit is unchanged.
- The attach client tracks failure per tab, cancels tab prompts when the viewed tab changes or disappears, redraws an active prompt after tab output, and shows create failures.
- The server logs slow lifecycle work and exposes start-slot use and lifecycle backlog in host status; `a1 tabs status` flags a stalled backlog and the `a1 tabs doctor` bundle carries it.
- Integration tests prove input keeps flowing to an existing tab while a tab start is blocked.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `resident-tab-reliability`: terminal input is never queued behind tab lifecycle work, and start-slot waits are bounded.
- `multi-agent-tabs`: tab failure input rules and tab prompts are scoped to the viewed tab.

## Impact

- `native/terminal-host/src/roles/server.rs`, `roles/attach.rs`, `fault_injection.rs`, and `tests/role_integration.rs`.
- `src/cli/tabs.ts` status output and its test.
- No protocol generation change: new frames are additive and old clients ignore them.

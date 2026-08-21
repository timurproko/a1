# Structured workspace checkpoint

Recorded at `2026-08-21T06:48:20Z` from milestone baseline commit `41378b1e2c05fea5fef4e3f14f87afbb1bf6feef` plus the task 5.6 working changes.

## Accepted scope

- Bare `a1` selects the A1-owned structured workspace application.
- The workspace starts with one Pi SDK-backed structured agent and exposes one workspace-specific `/agent` command with list, new, select, next/previous, stop, restart, and remove actions.
- Agent tabs preserve independent transcript, tool, editor, command, lifecycle, unread, attention, failure, and snapshot-recovery state.
- Regular and fullscreen renderer modes use the accepted A1-owned shell root and pinned vanilla-style presenters.
- `a1 pi` and `a1 sandbox` retain their explicit transparent routing.
- Structured workspace source imports neither Pi-specific feature contracts nor terminal-host protocol/runtime code. The composition root alone selects the Pi adapter.
- Normal bare startup does not create a pseudoterminal, launch/connect to the composed terminal host, expose arbitrary CLI panes, or claim composed-terminal support.

## Automated acceptance

- `npm run build` — passed.
- Typecheck and architecture checks — passed.
- Structured workspace/composition acceptance — passed in regular and fullscreen modes.
- Owned-UI static, event-frame, startup-composition, customization, and lifecycle tests — passed.
- Launch profile, explicit-mode, exact-Pi-entry, and CLI dispatch tests — passed (`72/72` containing tests).
- Package surface integration — passed (`2/2`), preserving the sole installed `a1` command.
- Strict OpenSpec validation — passed.

The first containing-suite invocation overlapped `npm run build`; its clean step temporarily removed `dist` and caused one development-launch import failure. The affected test and complete containing suite passed sequentially after the build completed.

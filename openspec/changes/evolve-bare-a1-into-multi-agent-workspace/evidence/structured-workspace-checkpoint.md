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

## Development preview publication

The accepted structured-only slice was merged into `develop`, versioned as `0.1.1-dev.3`, and validated again against exact commit `c98df94e63bdfbb1b28fb95f30e01207f8b7f6ed`. GitHub Actions run [32456288769](https://github.com/timurproko/a1/actions/runs/32456288769) completed successfully at `2026-08-21T06:58:40Z` and published the exact package under npm tag `next` with provenance.

- Integrity: `sha512-tUuTvHOsC3I034itSKF7m1z9qRP6GBdpS6ceqxa0TstiEIrFycQyGCwHveVeEGlLTkDVrlU7haQv9pVduRkMFg==`
- Shasum: `d9ebf55e5c082e84d676930e36c9ee0fc1a8075a`
- `next`: `0.1.1-dev.3`
- `latest`: unchanged at `0.1.0`

This is an uncertified Windows development preview of the structured workspace only. Composed multipane behavior remains unavailable and no composed-terminal or stable cross-platform support claim is made.

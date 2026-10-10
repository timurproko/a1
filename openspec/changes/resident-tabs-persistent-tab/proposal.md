# Proposal

## Why

Milestone 1 proved the operating-system primitives and the wire protocol, but nothing uses them yet. The first user-visible test of the resident design is one agent that keeps running after its terminal closes and comes back, with its exact screen, when `a1` is run again. That needs all three native roles, the A1 UI in tab mode, a registry, a bridge, and a launch route, working together on Windows x64, macOS, and Linux. Proving that path with a single tab, before adding more tabs, failure isolation, or crash recovery, keeps each later milestone small and keeps the evidence honest.

This is milestone 2 of 6 (see `docs/architecture/resident-tabs.md`, Roadmap). Milestone 1, `resident-tabs-contracts` (PR #586), must be merged first.

## What Changes

- Add the `server`, `holder`, and `attach` roles to `native/terminal-host`, built on milestone 1's platform layer, protocol generation 1, and sans-IO core. The fixed 2×2 proof leaves the shipping path; its non-interactive probes stay as tests.
- Add tab mode to the owned UI: `node bin/ui.js --tab` consumes its bridge credentials before any extension loads, suppresses the outer intro and the quit outro, and routes `/quit` and empty-editor `Ctrl+D` to a detach request instead of exiting.
- Add a minimal authenticated registry (one tab record, written with milestone 1's durable atomic replacement under the registry-writer lease) and a minimal tab bridge (readiness, session file and name, working or idle).
- Add the `residentTabs` setting, default `false`. When it is on, bare `a1` calls `ensureTerminalHost()` beside `ensureSupervisor()` before the launch guardian, and the launch instance runs the native attach client instead of `bin/ui.js`.
- When resident survival cannot be verified, bare `a1` uses today's direct path with one notice.
- The attach client owns raw mode, the alternate screen, outer mode negotiation, a minimal one-tab strip, and a local double-`Ctrl+C` detach that forwards only the first press.
- Extend A1's surviving-owner terminal restoration (#667) to a killed attach client.
- Give every tab process its own launch runtime id, so worktree claims (#736) never collide.

## Capabilities

### New Capabilities

- `multi-agent-tabs`: bare A1 runs, detaches from, and reattaches to one resident A1 tab when opted in.

### Modified Capabilities

- `resident-terminal-host`: adds the server, holder, and attach roles, the minimal registry and bridge, retained reattach, and credential derivation on top of milestone 1's primitives.
- `owned-ui-settings`: declares the opt-in `residentTabs` setting.
- `a1-shell`: bare `a1` may run the native attach client over a resident tab when opted in.
- `launch-instance-lifecycle`: the resident terminal host becomes the explicit resident capability that may outlive a launch instance.
- `owned-pi-ui-foundation`: quit routes inside a resident tab detach the client instead of ending the tab.

## Impact

- Native: `native/terminal-host` gains role modules, a bounded holder I/O path, and integration tests on three platforms. The `--run` 2×2 mode, `--probe-2x2`, and `--topology-2x2` are retired; `--probe`, `--probe-scroll`, `--probe-selection`, and `--probe-input` remain.
- Node: `bin/ui.js`, `src/foundation/release/bootstrap.ts`, `src/foundation/launch-guardian/main.ts`, `src/foundation/terminal-cleanup/`, `src/composition/owned-ui.ts`, `src/app/session-shell/`, `src/ui/settings/`, and `src/product-identity.json` change; a new `src/foundation/resident-tabs/` module holds launch routing, artifact resolution, and the bridge client.
- Documentation: `docs/architecture/resident-tabs.md`, `docs/architecture/terminal-host-proof-gate.md`, and `native/terminal-host/README.md` are updated; historical spike evidence is unchanged.
- With `residentTabs` at its default `false`, bare `a1`, `a1 pi`, and `a1 --session` behave exactly as today. The terminal host is not packaged in releases until milestone 6, so on an installed build the opt-in falls back with its notice unless an artifact is supplied.

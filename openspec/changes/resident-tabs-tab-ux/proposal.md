# Proposal

## Why

Milestones 1–4 make resident tabs exist, survive, fail independently, and recover, but the user still cannot work with several tabs comfortably: there is no complete strip, no status icons from the engine, no shortcuts or commands for creating, renaming, reordering, and closing tabs, and no safe way to use two terminals at once. The design and roadmap are in `docs/architecture/resident-tabs.md` (Decisions 5, 6, 7, 11, and 12).

This is milestone 5 of 6. It starts only after `resident-tabs-contracts` (#586), `resident-tabs-persistent-tab`, `resident-tabs-failure-isolation`, and `resident-tabs-crash-recovery` have merged to `develop`. Everything stays behind `residentTabs` (default `false`); with it off, bare `a1` behaves exactly as today.

## What Changes

- Complete the tab bridge: sequenced engine-derived status, event-loop heartbeat, session file and name with name source, interrupted-prompt metadata, needs-input from extension UI, trust, and permission requests, queued-input flag, visibility throttling, rename, and graceful stop. It supersedes milestone 2's minimal bridge requirement.
- Add the server-side status state machine and glyph set (Decision 7). Icons are the only attention signal; BEL is never forwarded.
- Draw the full single-row strip in the native attach client: grapheme-width chips of at most 20 columns, overflow `…` menu, reserved `+`, empty state, and theme roles resolved from A1 settings.
- Add per-client viewed tabs, mouse click, right-click menu, and drag reorder with expected revisions.
- Add declared, configurable, conflict-checked tab shortcuts, listed in `/hotkeys`, and the double-`Ctrl+C` detach chord.
- Add `/new-tab`, `/close`, `/tabs`, `/quit-all`, and tab rename through `/name`; busy-close confirmation and graceful stop; detach hints.
- Enable two attached clients with one input controller per tab using the milestone-1 controller-transfer barrier, and immutable command-origin generations so `/quit` and empty-editor `Ctrl+D` detach only their origin client.
- Resident session selection: `a1 --session X` opens a new tab or focuses the holder; a direct-mode conflict fails safe or offers a fork.
- Certify text-terminal extension fidelity against direct bare A1 on each platform; image requests use the text fallback.
- Then add LLM auto-naming (on by default), one prewarmed standby tab, and 60-minute idle suspension, with their settings and hard caps in the owned settings screen.
- Measure cold launch, warm tab creation, reattach, input-to-process, and output-to-present latency against declared budgets on each platform.

## Capabilities

### New Capabilities

- `multi-agent-tabs`: the bare-A1 tab presentation, status, shortcuts, commands, rename, close, and concurrent-client behavior.

### Modified Capabilities

- `resident-terminal-host`: adds the complete tab-bridge requirement (replacing milestone 2's minimal one) and bounded, observable resident resources.
- `cli-session-resume`: `a1 --session` opens or focuses a resident tab; direct conflicts fail safe or offer a fork.
- `launch-instance-lifecycle`: a session selection is delivered through the launching attach client and focuses the holding tab only in that client.

## Impact

- `native/terminal-host`: attach-client strip, menus, inline editor, shortcut matcher, mouse handling, controller UI, and status state machine in the server core; bridge protocol messages added within generation 1 (additive).
- `src/`: a new tab-mode bridge module, engine-event status derivation, slash commands, auto-naming, visibility throttling, settings declarations and a Tabs settings section, keybinding declarations and conflict checks, resident session-selection routing, and direct-mode fork offer.
- `bin/cli.js` and `bin/ui.js` launch paths pass theme roles, effective tab bindings, and session selection to the attach client.
- Tests on Windows x64, macOS, and Linux; no change for users with `residentTabs` off. Packaging, `a1 tabs` commands, cohort retention, and certification remain milestone 6.

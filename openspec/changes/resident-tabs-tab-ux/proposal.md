# Proposal

## Why

Milestones 1–4 make resident tabs exist, survive, fail independently, and recover, but the user still cannot work with several tabs comfortably: there is no complete v2-style strip, no status icons from the engine, no mouse or assignable shortcut surface for creating, renaming, reordering, and closing tabs, and no safe automatic control transfer between two terminals. The design and roadmap are in `docs/architecture/resident-tabs.md` (Decisions 5, 6, 7, 11, and 12).

This is milestone 5 of 6. It starts after `resident-tabs-contracts` (#586), `resident-tabs-persistent-tab` (#746), `resident-tabs-failure-isolation` (#747), and `resident-tabs-crash-recovery` (#748) have merged to `develop`. Tabs are controlled by Settings > Tabs > Enable tabs (`residentTabs`), a Yes/No setting that defaults to Yes; choosing No keeps bare `a1` on the direct path.

## What Changes

- Complete the tab bridge: sequenced engine-derived status, per-tab resolved accent, event-loop heartbeat, session file and name with name source, interrupted-prompt metadata, needs-input from extension UI, trust, and permission requests, queued-input flag, visibility throttling, rename, and graceful stop. It supersedes milestone 2's minimal bridge requirement.
- Add the server-side status state machine and glyph set. Icons are the only attention signal; working uses each tab's own A1 accent and BEL is never forwarded. Open tabs are never suspended.
- Draw the native strip with the v2 appearance: fixed top-row neutral chip colors, wallpaper-backed empty state, right-aligned clock, grapheme-width chips of at most 20 columns, always-visible `×`, overflow `…`, reserved `+`, mouse, inline rename, and auto-name title animation.
- Keep `Alt+A`, `Alt+W`, `F2`, and `Alt+1`…`Alt+0` defaults plus double-`Ctrl+C` detach. Declare next/previous and move-left/right actions without defaults so users may assign them in `keybindings.json`; conflict-check every assigned binding.
- Keep tab management in the strip rather than adding slash commands: `+`/`Alt+A` create, `×`/`Alt+W`/the context menu close, drag reorders, and existing `/name` renames. No `/new-tab`, `/close`, `/tabs`, `/quit-all`, or `/restart-tab` is exposed.
- Wire the milestone-1 controller-transfer barrier for two clients, automatically claiming the viewed tab when a terminal gains focus or first sends input. `/quit` and empty-editor `Ctrl+D` retain immutable origin stamping and detach only their current origin; double `Ctrl+C` remains attach-local.
- Route `a1 --session X` to focus the holding tab in the launching client or open it in a new tab; a direct-mode conflict fails safe or offers a fork.
- Certify text-terminal extension fidelity against direct bare A1 on each platform; image requests use the text fallback.
- Put `residentTabs` in Settings > Tabs as `Enable tabs` (Yes/No, default Yes), show `tabsMax` and `tabsAutoName` there only while enabled, and remove the user-facing unresponsive-restart and stall-notice controls while retaining their internal fixed behavior. Keep concurrent starts (2, hard cap 8) and one prewarmed standby as internal constants. Auto-naming is on by default, uses the tab model, never overrides a user rename, and animates exactly like v2.
- Measure cold launch, warm tab creation, reattach, input-to-process, and output-to-present latency against declared budgets on each platform.

## Capabilities

### New Capabilities

- `multi-agent-tabs`: the bare-A1 tab presentation, status, mouse, assignable shortcuts, rename, close, detach, and concurrent-client behavior.

### Modified Capabilities

- `resident-terminal-host`: adds the complete tab-bridge requirement (replacing milestone 2's minimal one) and bounded, observable resident resources without idle suspension.
- `cli-session-resume`: `a1 --session` opens or focuses a resident tab; direct conflicts fail safe or offer a fork.
- `launch-instance-lifecycle`: a session selection is delivered through the launching attach client and focuses the holding tab only in that client.

## Impact

- `native/terminal-host`: v2-style attach-client strip, menus, close buttons, inline editor, shortcut matcher, mouse handling, automatic controller claims, status state machine, and additive bridge protocol messages within generation 1.
- `src/`: a tab-mode bridge module, engine-event status derivation, auto-naming and animation metadata, visibility throttling, the three approved Tabs settings, keybinding declarations and conflict checks, resident session-selection routing, and direct-mode fork offer.
- `bin/cli.js` and `bin/ui.js` launch paths pass v2 presentation constants, effective tab bindings, and session selection to the attach client.
- Tests on Windows x64, macOS arm64, and Linux x64; no change for users with `residentTabs` off. Packaging, `a1 tabs` maintenance commands, cohort retention, and certification remain milestone 6.

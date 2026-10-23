## Why

When the last resident tab closes, bare `a1` leaves the attach client showing a strip with a lone `+`, the clock, and an empty surface. Nothing names the product, its version, or where new tabs will start.

## What Changes

- Replace the blank no-tab surface with an attach-owned **landing**: the launch cwd where an Agent tab's footer shows it, `a1` and its running version below it, and the `a1` wordmark in the profile's accent above it, so the folder does not move when a tab opens. The strip keeps `+` and the clock.
- Keep a hidden Settings tab running beside the landing, as beside Agents, so Settings opens without a start; it closes when the client detaches, and an attach treats a registry holding only Settings as empty.
- The landing holds no input. Tab shortcuts, the `+` launcher, strip mouse input, and the double-`Ctrl+C` detach work as with tabs.
- Bare `a1` with no Agent opens on the landing instead of starting one. `attach.start` gains an optional `startAgent` intent that bare `a1` sends as `false`; an older client omits it and keeps its first Agent.
- Starting an Agent from the landing wipes the wordmark from the right into a white cell where the Agent's caret appears.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `multi-agent-tabs`: the empty resident shell presents the landing instead of a blank surface; bare `a1` with no Agent opens on it; last-tab-close, hidden-Settings-close, first-launch, and lifecycle scenarios now expect the landing body.

## Impact

- **Native host:** a new `native/terminal-host/src/roles/landing.rs` renderer with its pinned accent table, `roles/attach.rs` (read the release version, present the landing as the no-tab body, close a lone hidden Settings on detach), `core/attach/machine.rs` (prewarm Settings on the landing), and `roles/server` (an attach ignores a lone Settings tab when choosing and starting its first Agent).
- **TypeScript:** a test that pins the native accent table to `derivePiAccentProjection`.
- **Documentation:** `docs/architecture/resident-tabs.md` Decision 11 records the landing.
- **Protocols and dependencies:** one additive optional `startAgent` field on `attach.start`; older peers ignore or omit it. No new dependency.

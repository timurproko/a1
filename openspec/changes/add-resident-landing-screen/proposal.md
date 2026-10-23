## Why

When the last resident tab closes, bare `a1` leaves the attach client showing a strip with a lone `+`, the clock, and an empty surface. Nothing names the product, nothing invites the next prompt, and the only way forward is to find the `+` launcher or remember `Alt+A`. The OpenCode home screen shows the better pattern: a wordmark, one prompt box, and the few shortcuts that matter.

## What Changes

- Replace the blank no-tab surface with an attach-owned **landing**: the `a1` wordmark in the profile's accent, a ruled prompt box that mirrors the owned editor, the launch cwd, and the effective `New A1 tab` and `Open Settings tab` shortcuts, vertically centred below the unchanged strip. The strip keeps `+` and the clock.
- Let the user type into the landing with the existing inline-rename editing controls plus paste, `Esc` to clear, and the solo `Ctrl+C` clear/detach meaning. `Enter` with text creates one Agent in the launch cwd with that text as its **seeded first prompt**; the landing keeps the submitted text behind the accent progress spinner until the Agent's first frame commits, and then the standard tab UI takes over. `Enter` on an empty box does nothing; a refused creation restores the text and shows the existing failure notice.
- Carry the seed from the attach client to the Agent without putting prompt text on the bridge: `tab.create` gains a bounded optional `initialPrompt`, the server writes it to an owner-only `seed-prompt.json` in the tab's private data directory before the holder starts (or before a standby is promoted), and the child consumes that file exactly once when its shell can accept a prompt. The bridge carries only a content-free `bridge.seed` notification so a promoted standby learns a seed exists.
- Submit the seeded prompt through the ordinary resident submission path (journal, status, automatic naming), retained until no startup route or dialog holds the screen.
- First launch is unchanged: bare `a1` with no resident tab still creates one Agent and views it. The landing appears only while the attach client has no tab to show.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `multi-agent-tabs`: the empty resident shell presents the landing instead of a blank surface; last-tab-close, hidden-Settings-close, and lifecycle scenarios now expect the landing body; landing input, submission, and failure behavior.
- `resident-terminal-host`: a created tab's first prompt is seeded through a private per-tab file; the bridge's server-to-child notifications gain a content-free seed notice while the no-content rule stays.

## Impact

- **Native host:** `native/terminal-host/src/core/attach/` (landing editor state, submission state, key/paste/mouse routing with no tabs), a new `roles/landing.rs` renderer, `roles/attach.rs` (present the landing body and cursor, create-with-prompt request), `roles/wire.rs` (`TabCreate.initial_prompt`), `roles/server/lifecycle.rs`, `standby.rs`, `bridge.rs`, and `core/server.rs` (seed file, pending-seed runtime state, `bridge.seed`), `protocol/fixtures.json`, and `core/sim` attach coverage.
- **TypeScript child:** `src/foundation/resident-tabs/bridge-client.ts` (`bridge.seed` command), a seed-file reader beside the recovery storage, `src/composition/resident-tab-bridge.ts` and `owned-ui.ts` (seed command wiring), and `src/app/session-shell` (submit a retained seed once the shell is ready).
- **Documentation:** `docs/architecture/resident-tabs.md` Decision 11 records the landing and seed delivery.
- **Protocols and dependencies:** one additive optional field on `tab.create`, one additive bridge message pair and a `bridge-seed` welcome feature; older peers ignore both. No new runtime dependency.

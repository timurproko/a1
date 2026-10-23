## Why

When the last resident tab closes, bare `a1` leaves the attach client showing a strip with a lone `+`, the clock, and an empty surface. Nothing names the product, its version, or where new tabs will start.

## What Changes

- Replace the blank no-tab surface with an attach-owned **landing**: a header with the `a1` wordmark in the profile's accent, `a1` and its running version, and the shortened launch cwd. The strip keeps `+` and the clock.
- Place the header one row from the strip: at the top of the body below a top strip, and at the bottom of the body above a bottom strip.
- The landing holds no input. Tab shortcuts, the `+` launcher, strip mouse input, and the double-`Ctrl+C` detach work as with tabs.
- First launch is unchanged: bare `a1` with no resident tab still creates one Agent and views it. The landing appears only while the attach client has no tab to show.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `multi-agent-tabs`: the empty resident shell presents the landing instead of a blank surface; last-tab-close, hidden-Settings-close, and lifecycle scenarios now expect the landing body.

## Impact

- **Native host:** a new `native/terminal-host/src/roles/landing.rs` renderer with its pinned accent table, and `roles/attach.rs` (read the release version, present the landing as the no-tab body).
- **TypeScript:** a test that pins the native accent table to `derivePiAccentProjection`.
- **Documentation:** `docs/architecture/resident-tabs.md` Decision 11 records the landing.
- **Protocols and dependencies:** none.

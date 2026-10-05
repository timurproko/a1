## Why

Bare A1 currently appends `/session` statistics permanently to the session transcript, unlike its full-screen Changelog and Keyboard Shortcuts reference documents. The report should be an inspectable, dismissible screen that does not add session-content noise, while its hierarchy should use the established owned-screen title and section styling.

## What Changes

- Declare `/session` as a bare-A1 owned reference route that opens full screen and appends no document, status, or checkmark row to the feed.
- Preserve the complete current session report, with `Session Info` as the screen title, identity rows before the groups, and `Messages`, `Tokens`, `Cache Warming`, and conditional `Cost` rendered through the same shared section-header presentation as Hotkeys' `Navigation` section.
- Reuse the existing reference-screen keyboard, wheel, scrollbar, close, interrupt, and viewport-restoration behavior, taking a fresh statistics snapshot each time the command opens.
- Keep `a1 pi` on the pinned workflow and in-feed session-info presentation, and update ownership evidence for the intentional bare-A1 divergence.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Add `/session` to the bare-A1 full-screen reference routes with shared section styling and no feed output.
- `custom-session-viewport`: Exempt declared owned full-screen reference routes from transcript placement while retaining transcript placement for other structured command output.

## Impact

- Affects the owned route catalog and composition providers, the reusable reference-document shape, and the Pi session-info presenter used to derive the screen rows.
- Adds focused reference-screen, route-host, shell-integration, presenter, and ownership-governance coverage.
- Changes no session data, statistics calculations, settings, dependencies, or `a1 pi` comparison behavior.

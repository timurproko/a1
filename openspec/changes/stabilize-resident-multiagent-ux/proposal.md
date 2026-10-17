## Why

The resident multi-agent interface still exposes host mechanics instead of behaving like several normal A1 sessions: input-control rejections appear over the surface, add and close transitions flash stale or failed tab states, later agents can retain partial terminal patches incorrectly and appear frozen until completion, and the popup closes on the mouse release that follows the click which opened it. Settings is also incorrectly injected into an Agent tab, remains advertised as a slash command, lacks its requested shortcut, and cannot reliably be navigated as the global singleton shown in the v2 prototype.

This change makes resident tabs quiet and immediate, restores independently streaming A1 behavior for every agent, and promotes global Settings to a first-class singleton tab without imposing a user-facing tab count.

## What Changes

- Render the empty resident surface as only a hoverable `+` control; suppress `read-only-viewer` and other controller-internal text rather than painting a notice row, background, or stray cursor.
- Keep first input across a controller transfer pending until ownership is acknowledged, so tab switching, Settings, and ordinary prompt interaction never leak a rejected key or require a takeover gesture.
- Match the v2 popup visually in truecolor and palette terminals, retain it through the opening mouse release, provide stable row hover, and make every enabled item mouse-clickable.
- Open Settings as one global singleton tab from the launcher or `Alt+Period`; selecting either route activates the existing Settings tab or creates it, and closing the Settings screen closes that utility tab.
- Hide and disable `/settings` only inside resident Agent tabs while retaining it in `a1 solo` and `a1 pi`; the resident launcher and shortcut become the supported entry points.
- Remove the `tabsMax` setting, configured/hard count refusal, and tab-limit notice. New Agent tabs remain constrained only by real start/resource failures, which continue to fail concisely without inventing a user quota.
- Make create, close, switch, and status updates commit only coherent current state. Intentional close never exposes a red failure icon, read-only snapshot, close glyph, or intermediate stopped tab; create does not expose a provisional flashing chip.
- Treat holder-to-client surfaces as complete retained frames at every commit boundary, retain current state for hidden tabs, and keep each agent's PTY drain/render path independent so switching among simultaneous runs immediately shows each partial reply and then continues streaming.
- Add Ctrl+Left and Ctrl+Right word movement to inline tab rename, preserving grapheme-safe character movement and existing editing controls.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `multi-agent-tabs`: refine empty-state silence, controller handoff, popup interaction, Settings-tab routing, tab creation/closure presentation, rename editing, and concurrent streaming behavior.
- `resident-terminal-host`: remove the user tab quota and require complete retained surfaces plus independent per-tab progress.
- `owned-ui-settings`: make Settings a singleton resident utility tab and suppress its slash-command route only in resident Agent sessions.

## Impact

- **Native resident host:** `native/terminal-host/src/roles/attach.rs`, `holder.rs`, `server.rs`, `presentation.rs`, `strip.rs`, wire/registry models, and focused Rust integration fixtures.
- **Owned UI and Settings:** resident launch context, Settings route hosting, shortcut projection, command/autocomplete catalog filtering, and Settings-manager composition.
- **Configuration:** `tabsMax` is retired from presentation and enforcement; an existing stored property is ignored and preserved by forward-compatible profile-document writes.
- **Compatibility:** `a1 solo` and `a1 pi` retain their current Settings command. Existing Agent tabs and sessions remain readable; registry evolution defaults historical records to Agent kind.
- **Dependencies:** no new runtime dependency is expected.

## Why

An active multi-agent client can render an immutable predecessor Agent that does not contain the newly shipped JavaScript release observer. It can therefore miss restart readiness even though an approved newer client is already active locally. A launch while installation is in progress must keep attaching to a verified retained client instead of appearing blank or requiring interruption. The tab bar's Version and Time are configurable but do not yet expose the direct interactive affordance or background choices users expect.

## What Changes

- Move multi-agent restart-readiness observation and presentation into the native disposable outer client so it compares its own executing version with approved local active release state independently of attached Agent code or registry discovery.
- Preserve the existing exact installed message, report it only after activation, and prove a post-notice restart promptly reconnects the new client to the same live Agents without replaying work or presenting a blank terminal while an update transaction is active.
- Make Version and Time separately hoverable and right-clickable; their context menu opens a **Right Side** multi-select configuration surface through **Configure**.
- Add a live tab-bar background setting with **Transparent** (default), **Black**, and **Accent** choices matching the established fullscreen canvas palette.
- Render right-side Version and Time with the same dim text token as the resident status/footer rather than a separate hard-coded gray.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `cli-self-update`: Require a current multi-agent outer client to surface local restart readiness independently of attached predecessor Agent code, and retain usable launch behavior during an active update transaction.
- `owned-pi-ui-foundation`: Keep update readiness non-transcript and ensure direct restart reconnects retained live work without a blank handoff.
- `multi-agent-tabs`: Add interactive Version/Time hit targets, right-side configuration access, configurable tab-bar canvases, and status-consistent right-side text.
- `owned-ui-settings`: Add a live tab-bar background setting and name the Version/Time configuration surface Right Side.

## Impact

- Native attach update-state observation, overlays, strip hit geometry, popup state, settings persistence, and canvas rendering.
- Release bootstrap/restart integration coverage using actual retained multi-agent processes.
- Owned setting declarations, settings dialogs, schema migration, and focused TypeScript/Rust tests.

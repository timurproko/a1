## Why

Pi 0.85.1 is published and A1 pins 0.84.2. The nightly upstream sync proposed this upgrade with every derived artifact refreshed, so the work here is the design part: resolving the conflict hunks in the vendored copies with each file's recorded deviations as the guide, adopting the public API changes in 0.85.1, and mapping the settings and commands that moved.

## What Changes

- Pin `@earendil-works/pi-coding-agent` and `@earendil-works/pi-tui` at 0.85.1 (upstream commit d981de1229ef899957bbe968bc8dcda02a21f477); re-pin the startup graph (151 files, 1,460,061 bytes) and the Pi public artifact (1,875 files, 8,830,058 bytes).
- Resolve the 17 conflict hunks in 11 vendored copies: BOM stripping inlined where upstream imports a private util (`keybindings.ts`, `external-editor.ts`); the capitalized key hint formatter kept local (`scoped-models-selector.ts`); the status indicator's `colorFn` and border renderers (`status-indicator.ts`); the leading accent checkmark (`trust-selector.ts`); mouse events and the history label moved into `renderTopBorder` (`editor-core.ts`); `MouseRegion` click-to-expand and `handleMouse` (`tool-execution.ts`, which also keeps A1's built-in renderer fallback because 0.85.1 moved that merge to the caller); A1's owned editor, theme unit, text helpers, and theme controller kept as they were (the editor-border working status is not adopted; explicit disposal was already owned).
- Adopt the settings model of 0.85.1 in A1's owned settings: `modelThinkingLevels` (per-model overrides as one record; the owned settings dialog gains choice parts, rows resolved from the models the engine offers, `default` clears an override) and `fullscreenCopyOnSelect`; the global `thinkingLevel` leaves the settings dialog; the pinned selector's `onModelThinkingLevelChange`/`Remove` and `onFullscreenCopyOnSelectChange` are routed.
- Add the `/thinking` workflow route (exact level or the pinned selector, `persist` stores the default) and "select as default" in the model picker (`persist` on the model route, `setModel(model, { persist })`); the advertised command order follows 0.85.1.
- `OverlayHandle.getBounds()` on every A1 overlay handle; `scrollbarTrackStyle`/`scrollbarThumbStyle` replace the single scrollbar style; `scrollbarThumb` and the new `scrollbarTrack` are foreground theme colors; the built-in theme resources are regenerated from 0.85.1.
- Ledger: five units new to 0.85.1 (`chat-viewport`, `settings-submenu`, `session-share`, `theme-json`, `tui-renderer`) recorded as `public-api-reuse`; inventories re-anchored where sharing moved to `session-share.ts` and the dock layout to `chat-viewport.ts`; `settings-submenu.js` mapped; the settings edge is the per-model stepped submenu.
- Parity: the component and event-frame generators run under the pinned resolver hook (they produced empty key hints when pi-tui loaded twice); share messages link both URLs as 0.85.1 does; the command-outcome fixture exports the branch through the session manager before contacting GitHub; tests that named `0.84.2` or its commit read the identity authority.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: the pinned Pi identity moves to 0.85.1.

## Impact

User-visible Pi behavior changes carried by this bump (for the release notes): key hints are capitalized (`Ctrl+S`); the first toggle in the models selector from "all enabled" disables that model rather than keeping only it; trust and model lists mark the saved entry with a leading checkmark; per-model thinking levels and fullscreen copy-on-select are new settings; `/thinking [level]` is a command; the model picker can persist a default model; session sharing can upload to Radius when that provider is configured (A1 keeps the gist route only). The editor-border working status of 0.85.1 is not adopted by A1's owned frame.

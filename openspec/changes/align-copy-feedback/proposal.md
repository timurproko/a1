## Why

Bare A1 acknowledges selection copies with Pi's reverse-video flash stack at the top-right, which is visually detached from the prompt, can accumulate multiple rows, and still appears for whitespace-only payloads. The copy-on-selection behavior is also fixed even though pinned Pi already exposes `fullscreenCopyOnSelect` as a user preference.

## What Changes

- Replace bare A1's selection-copy flash with one transient, right-aligned, theme-accent acknowledgement immediately above the editor, matching the requested compact prompt-adjacent presentation.
- Report the character count of the exact copied plain-text payload, replace an existing acknowledgement rather than stacking, and suppress the acknowledgement when that payload contains only whitespace.
- Honor pinned Pi's `fullscreenCopyOnSelect` setting live in bare A1: enabled selections copy on release, while disabled selections remain available for explicit copy.
- Expose that existing Pi setting in the owned settings screen's Agent section using Pi's generated wording and persisted value.
- Keep copy delivery limits, failure reporting, explicit selection copy, semantic `/copy`, prompt copy/cut, and the `a1 pi` comparison profile unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `session-frame-selection`: Makes automatic copy conditional on the Pi setting and defines compact, non-stacking, payload-truthful success feedback.
- `owned-ui-settings`: Presents the supported Pi copy-on-select preference in the Agent section through the existing engine settings port.
- `pi-settings-runtime`: Applies `fullscreenCopyOnSelect` live to bare A1's real selection owner rather than treating it as unavailable.

## Impact

Expected implementation areas are the custom session viewport's release/copy routing, shell-owned transient dock presentation and timer lifecycle, Pi setting effect binding, and focused selection/settings/terminal-frame tests. The change reuses the pinned Pi settings manager and generated presentation metadata, adds no dependency, does not change persisted schema, and does not patch installed Pi code.

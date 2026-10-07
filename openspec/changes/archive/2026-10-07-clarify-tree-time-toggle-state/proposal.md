## Why

The Session Tree footer labels its timestamp toggle as `label time` but does not show whether the toggle is currently enabled. This makes the control less concise and less informative than the existing Resume Session `path (on)` / `path (off)` toggle hint.

## What Changes

- Rename the Session Tree timestamp shortcut action from `label time` to `time`.
- Append `(on)` or `(off)` to that footer action according to the current label-timestamp visibility state.
- Update the hint immediately when `Shift+T` toggles timestamp visibility, while retaining the existing timestamp rendering and result-counter status behavior.
- Add focused component coverage for both toggle states and the transition between them.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Make the Session Tree label-timestamp shortcut concise and expose its current on/off state.

## Impact

Expected implementation is limited to the bare-A1 tree selector help presentation, focused Session Tree component tests, and copied-source provenance metadata required by repository governance. Keybindings, timestamp formatting, labels, filter behavior, result-counter status, session persistence, dependencies, public APIs, and the explicit `a1 pi` comparison profile remain unchanged.

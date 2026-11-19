## Why

Bare A1's autocomplete rows begin two cells from the terminal edge while the working spinner begins one cell in, and its autocomplete and history counters begin four cells in. Moving this related input chrome one cell left will give the prompt area a consistent visual alignment.

## What Changes

- Shift the default-editor autocomplete menu one terminal cell left so its selection marker aligns with the working indicator.
- Shift autocomplete and prompt-history border counters one terminal cell left, preserving their values, styling, visibility, and border width.
- Update focused row, geometry, narrow-width, and terminal-paint coverage for both persistent-history modes.
- Leave prompt text, editor padding, completion behavior, comparison profiles, dialogs, extension-owned editors, and installed Pi packages unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `custom-session-viewport`: Define the one-cell autocomplete gutter and three-cell border-counter inset while preserving stable prompt geometry.
- `owned-pi-ui-foundation`: Declare the adjusted bare-A1 autocomplete and history-counter alignment without widening the replacement's scope.

## Impact

- Affects bare-A1 default-editor composition in `src/integrations/pi/components/upstream/components/owned-editor.ts`, counter borders in `shell-editor-autocomplete.ts` and `upstream/history/editor-core.ts`, and focused editor/shell rendering tests.
- No engine behavior, public extension API, dependency, setting, storage format, or comparison-profile change.

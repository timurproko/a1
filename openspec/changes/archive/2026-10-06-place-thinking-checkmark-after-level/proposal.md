## Why

The Thinking Level dialog originally padded every level name before its active checkmark, leaving a conspicuous gap on short values. Moving `✓` beside the active name fixes that state, and replacing `[default]` with a compact marker removes the wide textual column. The default is exclusive, however, so it must use a recognizable radio marker rather than the Models dialog's filled bullet for multi-selection.

## What Changes

- Render the active session checkmark immediately after the visible thinking-level name instead of in a shared vertical column.
- Replace `[default]` with an accent-colored selected-radio `◉` before the default level and dim unselected-radio `○` markers before every other level, distinguishing exclusive default state from Models multi-selection.
- Keep descriptions aligned across rows while active and default state remain independent.
- Preserve filtering, selection, immediate default persistence, controls, and the `a1 pi` comparison profile.
- Add focused row-geometry, semantic-style, and state-transition coverage.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Define exclusive radio-style default markers and item-adjacent active-checkmark placement for the bare-A1 Thinking Level dialog while retaining aligned descriptions.

## Impact

Implementation updates the owned thinking-selector row formatter, its source-port provenance record, and focused component assertions. Thinking-level behavior, settings data, dependencies, other dialogs, and installed Pi package files remain unchanged.

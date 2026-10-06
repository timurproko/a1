## Why

The Thinking Level dialog pads every level name to the widest name before rendering the active checkmark, so a short active value such as `high` leaves a conspicuous gap before `✓`. Other dialogs place the active checkmark directly after the item identity; matching that treatment makes the current level read as one item while retaining the useful alignment of defaults and descriptions.

## What Changes

- Render the active session checkmark immediately after the visible thinking-level name instead of in a shared vertical column.
- Put any width-balancing padding after the optional checkmark so `[default]` markers and descriptions remain aligned across rows.
- Preserve semantic colors, active/default independence, filtering, selection, default persistence, controls, and the `a1 pi` comparison profile.
- Add focused row-geometry coverage for short and long active level names.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Define item-adjacent active-checkmark placement for the bare-A1 Thinking Level dialog while retaining its aligned default and description columns.

## Impact

Implementation will update the owned thinking-selector row formatter, its source-port provenance record, and focused component assertions. Thinking-level behavior, settings data, dependencies, other dialogs, and installed Pi package files remain unchanged. This change contains planning artifacts only.

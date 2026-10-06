## Why

The Thinking Level dialog originally padded every level name before its active checkmark, leaving a conspicuous gap on short values. Moving `✓` beside the active name fixes that state, but the wide textual `[default]` column still makes the rows unlike the compact Models dialog. The default should use the same immediate filled/hollow bullet grammar as Models while active state remains a separate trailing checkmark.

## What Changes

- Render the active session checkmark immediately after the visible thinking-level name instead of in a shared vertical column.
- Replace `[default]` with a success-green filled bullet before the default level and muted hollow bullets before every other level, matching the Models dialog marker treatment.
- Keep descriptions aligned across rows while active and default state remain independent.
- Preserve filtering, selection, immediate default persistence, controls, and the `a1 pi` comparison profile.
- Add focused row-geometry, semantic-style, and state-transition coverage.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Define Models-style default bullets and item-adjacent active-checkmark placement for the bare-A1 Thinking Level dialog while retaining aligned descriptions.

## Impact

Implementation updates the owned thinking-selector row formatter, its source-port provenance record, and focused component assertions. Thinking-level behavior, settings data, dependencies, other dialogs, and installed Pi package files remain unchanged.

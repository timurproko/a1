## Why

The bare-A1 thinking selector currently appends `· default` to the configured level's description, which makes the setting look like descriptive text and places it far from the level's active-state checkmark. The configured default should instead be visible as a bracketed marker in the row's primary label region.

## What Changes

- Render the configured thinking default as the literal `[default]` marker instead of the description suffix `· default`.
- Order each row's primary state as the level name, the optional active checkmark, and the optional `[default]` marker, so a level that is both active and default reads `<level> ✓ [default]` before its description.
- Keep descriptions muted and column-aligned after the widest level/checkmark/default-marker combination.
- Preserve selection, filtering, active-level styling, default persistence, and comparison-profile behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Define the bracketed configured-default marker and its order relative to the active checkmark and aligned description.

## Impact

- Affects the owned bare-A1 thinking selector, its focused presentation tests, and the source-port ledger entry that records the owned presentation deviation.
- Does not change thinking levels, active/default state semantics, persistence, shortcuts, dependencies, or the `a1 pi` comparison selector.

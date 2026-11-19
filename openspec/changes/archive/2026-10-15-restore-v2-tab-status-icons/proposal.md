## Why

Resident tab chips currently animate working state with four quarter-circle glyphs such as `◐`, which does not match the approved v2 tab presentation visible in `E:/Backups/pi/v2`. Starting and restoring tabs also use a static ellipsis even though the resident-tab contract calls for dim progress frames.

## What Changes

- Restore v2's exact ten Braille progress frames (`⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏`) and 80 ms cadence for working tab chips.
- Animate starting and restoring chips with the same progress sequence using the established dim lifecycle color.
- Keep working progress in each tab's reported A1 accent and preserve the existing `?`, `✓`, `!`, and `✗` semantic status icons, chip geometry, clipping, and hit targets.
- Add deterministic native regressions for the complete frame sequence and lifecycle mappings, including the reduced fallback strip path.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `multi-agent-tabs`: Resident tab progress decoration uses the approved v2 frame sequence for working and dim startup/restore states.

## Impact

Affected areas are the native terminal host's tab-strip status decoration, animation scheduling, reduced fallback strip rendering, and focused Rust tests. No protocol, persisted state, settings, tab status derivation, chip layout, or non-tab UI changes.

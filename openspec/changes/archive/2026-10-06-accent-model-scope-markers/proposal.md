## Why

The Models dialog uses success green for its filled multi-select scope markers, while the Thinking Level dialog uses accent purple for its filled exclusive-selection marker. Using the same accent color makes these related selection indicators visually consistent without conflating scope membership with the active-model success state.

## What Changes

- Render the Models dialog's filled scope marker `●` with the semantic accent role, matching Thinking Level's filled default radio marker `◉`.
- Keep empty scope markers dim and active-model checkmarks success-colored so each state remains distinguishable.
- Preserve model filtering, scope toggling and persistence, active-model selection, row layout, and the pinned `a1 pi` comparison profile.
- Add focused semantic-style coverage for filled and empty scope markers in selected and unselected rows.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Align the Models multi-select scope indicator color with the Thinking Level exclusive-selection indicator while preserving their distinct glyphs and behavior.

## Impact

Expected implementation is limited to the owned Models dialog marker styling, focused Models dialog tests, and the corresponding copied-source/specification evidence. No theme token, glyph, model behavior, persisted setting, Thinking Level behavior, or comparison-profile presentation changes.

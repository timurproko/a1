# Proposal

## Why

A value menu opens below its Settings row, so the value in effect is shown twice: once on the source row and again inside the menu. A pointer-opened menu also highlights nothing until the pointer moves, even though the press that opened it targeted the value in effect.

## What Changes

- Lay the shared value menu over its anchor so the entry for the value in effect occupies the anchor row, with earlier choices above and later choices below.
- Shift the menu only as far as needed to stay inside the body when it would run past the top or bottom.
- Start a pointer-opened menu on the value in effect, which now lies under the pointer, matching a keyboard-opened menu.
- Update shared menu and Settings interaction coverage for the new placement and initial highlight.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ui-components`: Place a value menu over its anchor at the value in effect and highlight that entry when the pointer opens it.

## Impact

Implementation is limited to `src/ui/components/value-menu.ts` placement, the initial menu index in `src/features/owned-ui/settings-app.ts`, and their focused tests. No settings declarations, persistence formats, backend contracts, migrations, or dependencies change.

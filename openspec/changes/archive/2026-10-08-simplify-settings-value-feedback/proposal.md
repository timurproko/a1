# Proposal

## Why

Settings rows sometimes expand a selected value into stored-versus-effective status text, and successful changes temporarily replace the stable shortcut footer with a save notice. This makes ordinary value changes visually noisy even though the selected value is already enough feedback.

## What Changes

- Always render a scalar Settings row as its currently selected/stored value, without an inline effective-value or application-boundary suffix.
- Keep the standing Settings shortcut guidance visible after successful live or deferred changes and successful undo restorations.
- Preserve immediate optimistic value updates and authoritative rollback/error feedback when a change fails.
- Keep the Settings list scrollable with the mouse wheel while a structured setting dialog is open, without making the dialog itself pointer-editable.
- Add focused coverage for deferred values, successful changes, undo, failure notices, and background scrolling with a structured dialog open.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-ui-settings`: Simplify scalar value presentation, keep standing shortcut guidance stable after successful setting changes, and permit wheel scrolling of Settings content behind a structured dialog.

## Impact

Expected implementation is limited to pointer routing and presentation in `src/features/owned-ui/settings-app.ts` plus focused Settings tests. No persistence format, setting application boundary, backend API, dependency, or migration changes are expected.

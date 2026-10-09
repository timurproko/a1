# Proposal

## Why

Pressing Enter on an enumerated Settings row currently changes the value immediately, while the same value can be reviewed in a menu only with the pointer. Keyboard users need Enter to open that menu first so they can inspect and navigate the available choices before committing a change.

## What Changes

- Make Enter on an editable enumerated Settings row open its scalar value menu instead of immediately cycling the setting.
- Give a keyboard-opened menu an active first choice immediately, while continuing to mark the effective value independently.
- Keep Up and Down navigation inside the menu, Escape cancellation without a write, and Enter confirmation of the active choice.
- Preserve pointer-opened menus with no initial highlight, direct Left/Right adjustment, numeric steppers, and structured-setting dialogs.
- Add focused Settings interaction coverage for keyboard opening, navigation, cancellation, and confirmation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-ui-settings`: Define the keyboard-first workflow for opening and operating enumerated scalar value menus.
- `ui-components`: Distinguish a keyboard-opened menu's requested initial choice from a pointer-opened menu's intentionally inactive opening state.

## Impact

Expected implementation is limited to value-menu orchestration in `src/features/owned-ui/settings-app.ts` and focused Settings tests. No settings declarations, persistence formats, backend contracts, migrations, dependencies, shared menu geometry, or pointer behavior are expected to change.

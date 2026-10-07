## Why

Changing a scalar in the owned Settings screen briefly renders the optimistic value against the entry's stale effective snapshot, producing a distracting `(effective …)` value flash before the backend refresh settles. The same screen offers no quick way to restore an accidental change, so users need a declared `Ctrl+Z` action that returns the most recent setting to its prior value.

## What Changes

- Keep an optimistically changed scalar visually stable while its save is unresolved, without briefly showing stale effective-value decoration.
- Add screen-local Settings undo history for successful scalar and structured-value edits, restoring each prior value through the setting's owning backend.
- Make `Ctrl+Z` undo the latest Settings edit throughout the Settings surface, including its value menu, search state, and structured-setting dialog.
- Derive visible `Ctrl+Z to undo` guidance and shortcut listings from the Settings shortcut declarations.
- Add focused interaction coverage for pending rendering, repeated undo, backend routing, structured values, and failed saves/restores.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-ui-settings`: Keep unresolved scalar values visually stable and support reversible Settings edits without bypassing persistence or application boundaries.
- `ui-shortcuts`: Declare and advertise `Ctrl+Z` as the Settings undo action in every applicable Settings scope.

## Impact

Expected implementation is concentrated in `src/features/owned-ui/settings-app.ts` and its focused tests, with no settings-document migration, dependency update, public API change, or change to the pinned `a1 pi` comparison interface.

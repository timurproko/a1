## Why

Changing a scalar in the owned Settings screen briefly renders the optimistic value against the entry's stale effective snapshot, producing a distracting `(effective …)` value flash before the backend refresh settles. The same screen offers no quick way to restore an accidental change, so users need a declared `Ctrl+Z` action that returns the most recent setting to its prior value.

## What Changes

- Keep an optimistically changed scalar visually stable while its save is unresolved, without briefly showing stale effective-value decoration.
- Add screen-local Settings undo history for successful scalar and structured-value edits, restoring each prior value through the setting's owning backend.
- Make `Ctrl+Z` undo the latest Settings edit throughout the Settings surface, including its value menu, search state, and structured-setting dialog.
- Derive concise shortcut/action guidance such as `Enter change`, `Ctrl+Z undo`, and `Esc close` from Settings declarations, without connective `to` wording or an inactive Space alternative.
- Let a structured-setting dialog's own top rule replace the ordinary Settings footer divider, then show its title, muted selected-part description, menu, hints, and bottom rule.
- Present the per-model thinking-level setting as a two-step keyboard selector with a stable `Thinking Level` title, muted inline step marker, next-line step description, ASCII `> ` model search, tightly aligned level choices, and concise context-specific shortcut guidance rather than the generic object-part panel.
- Keep structured-setting dialogs keyboard-only: pointer reports are consumed without moving or changing dialog state.
- Remove `Fullscreen wheel scrolling` from bare A1's Agent settings and runtime ownership because the owned global Scroll settings control the custom viewport; retain pinned comparison behavior.
- Present Pi's persisted `fullscreenCopyOnSelect` value as `Copy on select` in bare A1 because that product always uses the fullscreen custom viewport, without renaming its backend key.
- Align scalar-menu choice text with its source value and add focused interaction coverage for pending rendering, repeated undo, backend routing, structured values, failed saves/restores, dialog framing, per-model search/steps, hints, pointer suppression, and bare-A1 viewport-setting presentation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-ui-settings`: Keep unresolved scalar values visually stable, support reversible Settings edits without bypassing persistence or application boundaries, and preserve the standard single-rule dialog boundary.
- `ui-shortcuts`: Declare and advertise `Ctrl+Z` as the Settings undo action in every applicable scope, and centrally enforce concise owned-dialog shortcut grammar and styling.

## Impact

Expected implementation is concentrated in `src/features/owned-ui/settings-app.ts` and its focused tests, with no settings-document migration, dependency update, public API change, or change to the pinned `a1 pi` comparison interface.

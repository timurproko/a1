## Why

Resume Session currently turns whichever row has keyboard focus green and changes its metadata foregrounds, conflating navigation selection with the session that is actually active. It should match Session Tree: moving focus changes only the row background, while semantic text colors remain stable and the active session stays green like an active checkmark.

## What Changes

- Preserve each Resume Session row's title and metadata foreground roles when keyboard selection moves; selection adds the blue background and accent arrow without recoloring existing text.
- Render the currently active session title with the success-green role independently of which row is selected.
- Preserve delete-confirmation error styling, full-width row geometry, alignment, search, filters, and all session actions.
- Add focused ANSI-role regressions covering selected, unselected, active, named, and delete-confirmation rows as selection moves.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Separate Resume Session's navigation highlight from active-session state so selection preserves semantic foregrounds and the active session remains success green.

## Impact

The change affects the owned Resume Session row renderer, its focused component tests, copied-source provenance notes, and the `owned-pi-ui-foundation` presentation contract. It changes no CLI/session data, keybindings, dependencies, theme definitions, or Session Tree behavior.

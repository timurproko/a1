## Why

A pointer-opened Settings value menu currently highlights the value in effect immediately, even though the opening click targeted the setting row rather than a menu entry. The highlight then disappears as the pointer leaves that row and reappears only when the pointer reaches an option, producing a distracting and illogical selection flash.

## What Changes

- Open a Settings value menu with its effective value marked but no menu entry highlighted.
- Treat only pointer motion that reaches a menu row, or subsequent keyboard navigation, as choosing the active entry.
- Preserve direct pointer activation, keyboard navigation from the effective value, menu anchoring, outside-click dismissal, and the effective-value checkmark.
- Add focused interaction coverage for opening, entering, and leaving the menu.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ui-components`: Clarify that the pointer press which opens a value menu does not itself choose a highlighted entry; a later pointer movement onto an entry does.

## Impact

Expected implementation is limited to the Settings value-menu opening state and focused Settings interaction tests. It changes no setting values, persistence, keyboard ordering, menu geometry, shared theme roles, dependencies, or public APIs.

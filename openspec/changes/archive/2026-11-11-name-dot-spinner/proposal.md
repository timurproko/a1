## Why

The Spinner style name `current` describes implementation history rather than the animation, unlike circle, diamond, and square. Name it `dots`, present the default animation first, and move the disabled choice to the end.

## What Changes

- Display `dots`, `circle`, `diamond`, `square`, and `none`, in that order, in the Spinner style row and dropdown.
- Keep dots as the default and fallback, with the existing dot animation and previews unchanged.
- Retain the persisted `current` identifier for dots, preserving existing profiles without migration or overwriting explicitly selected styles.

## Capabilities

### Modified Capabilities
- `owned-ui-settings`: clarify spinner display names, ordering, and default behavior.

## Impact

Owned settings declarations and value presentation, focused settings tests, and the owned-ui-settings specification. Rendering policy, Pi settings, comparison-profile behavior, and existing saved selections remain unchanged.

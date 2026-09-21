## Why

Bare A1 cycles thinking levels with `Ctrl+L`, but the `/thinking` selector still advertises the obsolete `Shift+Tab` binding and renders its title as unstyled text. Its current-level presentation also duplicates selection detail, places the checkmark before the level, and colors the selected description as primary text. The selector must agree with the active A1 shortcut and use the concise visual grammar established by the Models dialog.

## What Changes

- Make the bare-A1 thinking selector derive its cycle hint from the active A1 keybinding profile, showing `Ctrl+L` with default bindings instead of `Shift+Tab`.
- Render the `Thinking Level` selector heading with the same bold accent styling used by `Model Configuration` and other owned selector headings.
- Keep every level description inline after its title and muted grey, including on the highlighted row; show the active level with one green trailing checkmark and no duplicate detail below the list.
- Preserve filtering, navigation, level selection, default persistence, cancellation, and explicit keybinding overrides.
- Keep `a1 pi` isolated on its comparison-profile component and resolved bindings; this correction does not hardcode one label across profiles.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ui-shortcuts`: Require the bare-A1 thinking selector to display its live resolved cycle binding, including `Ctrl+L` by default and explicit user overrides.
- `owned-pi-ui-foundation`: Define the thinking selector's bold accent heading, inline muted descriptions, single trailing active marker, and retained interaction behavior.

## Impact

- Affects thinking-selector composition at the Pi component boundary, profile-aware keybinding activation, and selector presentation tests.
- Does not change engine thinking levels, cycle order, settings persistence, dependencies, or installed Pi package files.

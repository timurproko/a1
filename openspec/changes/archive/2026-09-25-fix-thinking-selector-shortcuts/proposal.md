## Why

The bare-A1 `/thinking` selector now separates default selection from saving, but the `[default]` marker and description column still move horizontally depending on which level owns the marker. The default is a simple setting and should instead persist immediately when Space changes it, without an unsaved state or redundant Ctrl+S step.

## What Changes

- Place every level name in a fixed-width region based on the widest available name, reserve the active-marker slot, and render `[default]` at one stable column for every level.
- Keep every description at one stable column after the reserved default-marker region regardless of which level is active or default.
- Make Space persist the highlighted level as the global default immediately without closing the selector or changing the active session level.
- Remove the redundant Ctrl+S save action and render the compact hints `Enter select  Space default  Esc close`.
- Keep Escape-only close behavior, filtering, navigation, active/default independence, footer restoration, and the `a1 pi` comparison selector unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Define fixed thinking-state columns, immediate default persistence on Space, no unsaved state, and the reduced compact shortcut footer.

## Impact

- Affects the owned bare-A1 thinking selector, the shell-to-settings persistence boundary, and focused component, shell-workflow, and engine tests.
- Does not change available thinking levels, cycle order, persisted settings format, active session selection semantics, dependencies, or the `a1 pi` comparison profile.

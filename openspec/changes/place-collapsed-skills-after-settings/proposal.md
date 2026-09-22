## Why

When skills are collapsed, the synthetic `skills` command is currently treated as an external resource and appended after every built-in command, including `quit`. It should instead sit with the primary built-in commands immediately after `settings`, making skill discovery prominent and keeping `quit` at the end of the built-in list.

## What Changes

- Place the collapsed `skills` command immediately after `settings` in bare A1's top-level slash-command menu.
- Preserve the existing pinned command order, collapsed-skill behavior, expanded per-skill ordering, resource-command ordering, and `a1 pi` comparison catalog.
- Add focused catalog and shell coverage for the collapsed and expanded ordering.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Define the collapsed `skills` command's position immediately after `settings` without changing other command catalogs.

## Impact

Implementation will affect the bare-A1 autocomplete catalog assembly in `src/integrations/pi/components/shell-editor-autocomplete.ts` and focused skills autocomplete tests. No engine command, dialog, persistence, or comparison-profile behavior changes are intended.

This change contains planning artifacts only, not implementation.

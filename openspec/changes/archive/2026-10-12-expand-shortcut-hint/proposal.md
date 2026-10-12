## Why

Collapsed bare-A1 tool output currently presents expansion hints inconsistently: the generic fallback now uses `Ctrl+O expand`, while package built-in renderers such as Bash still show `ctrl+o to expand`. Applying the established dialog shortcut grammar to every bare-A1 built-in collapsed tool hint makes the visible action consistent with hints such as `Ctrl+Z undo`.

## What Changes

- Render generic fallback and package built-in collapsed tool hints as `Ctrl+O expand` inside their existing geometry.
- Use the shared shortcut presentation so the effective expansion key receives the quiet key role and `expand` receives the muted action role.
- Preserve omitted-line counts, expansion behavior, effective keybindings, custom extension renderers, surrounding tool presentation, and the pinned `a1 pi` comparison route.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Declare concise shared shortcut presentation as an intentional bare-A1 difference for generic and package built-in collapsed tool output.

## Impact

Expected implementation remains at the source-derived tool-execution presentation boundary, its copied-source modification note, focused component coverage for built-in and fallback output, and the corresponding owned Pi UI specification. No keybindings, expansion behavior, dependencies, persisted data, extension-renderer output, or comparison-profile behavior change.

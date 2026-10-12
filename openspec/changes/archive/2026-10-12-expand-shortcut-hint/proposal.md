## Why

Collapsed fallback tool output currently ends with `ctrl+o to expand`, which uses different casing, wording, and semantic styling from A1's established dialog shortcut hints. Aligning it to `Ctrl+O expand` makes the expansion action scan consistently with hints such as `Ctrl+Z undo`.

## What Changes

- Render the collapsed fallback tool-output suffix as `Ctrl+O expand` inside the existing closing parenthesis.
- Use the shared shortcut presentation so the effective expansion key receives the quiet key role and `expand` receives the muted action role.
- Preserve the omitted-line count, expansion behavior, effective keybinding, surrounding tool-output presentation, and the pinned `a1 pi` comparison route.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Declare the concise shared shortcut presentation as an intentional bare-A1 difference for collapsed fallback tool output.

## Impact

Expected implementation is limited to the source-derived tool-execution fallback renderer, its copied-source modification note, focused component coverage for plain text and semantic ANSI roles, and the corresponding owned Pi UI specification. No keybindings, expansion behavior, dependencies, persisted data, or comparison-profile behavior change.

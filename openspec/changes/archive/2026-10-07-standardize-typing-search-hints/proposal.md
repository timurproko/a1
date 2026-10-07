## Why

Searchable dialogs currently render `type to search` as one muted action phrase, unlike neighboring hints that visually distinguish an input/key cue from its action. Presenting it as `Type search` makes the typing cue scan like the other shortcut labels and keeps the action in the established action color.

## What Changes

- Replace the searchable Models and Session Tree hint text `type to search` with `Type search`.
- Render `Type` with the shared quiet key role and `search` with the shared action-text role.
- Preserve hint ordering, spacing, wrapping/clipping, search behavior, keybindings, and the explicit `a1 pi` comparison profile.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Require typing-based search guidance in bare-A1 searchable dialogs to use the same key/action presentation as neighboring shortcut hints.

## Impact

Expected implementation is limited to the Models and Session Tree semantic hint declarations, their focused rendering/workflow tests, and the corresponding owned Pi UI specification. No commands, keybindings, dependencies, persisted data, or comparison-profile behavior change.

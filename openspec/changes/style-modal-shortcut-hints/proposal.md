## Why

Modal shortcut hints currently mix several presentations: some use middle dots, some paint the whole line one color, and only a few distinguish a shortcut from its action with the compact spacing shown in the Skills dialog. A consistent treatment will make every modal's controls easier to scan and remove decorative separators from these instruction rows.

## What Changes

- Give modal shortcut-hint rows one shared presentation: shortcut labels in the quiet key color, action names in a distinct text color, and two spaces between entries with no middle-dot or bullet separators.
- Apply the presentation across bare-A1 built-in, nested, startup, and extension-hosted modal surfaces while retaining each surface's effective keybindings and wording.
- Preserve responsive truncation/wrapping, focus, navigation, actions, and modal lifecycle behavior.
- Keep non-modal status/footer content and the explicit `a1 pi` comparison profile unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ui-components`: Define a reusable semantic shortcut-hint row with distinct key/action roles and separator-free spacing.
- `owned-pi-ui-foundation`: Require every bare-A1 modal branch to use the shared shortcut-hint presentation without changing modal behavior or the pinned comparison profile.

## Impact

Implementation will affect the shared A1 component presentation layer, owned/source-synchronized Pi modal components, the pre-resource trust selector's equivalent fixed-color rendering, and focused modal snapshots and inventory coverage. Shortcut declarations, keybinding resolution, commands, modal transitions, and installed Pi package code remain unchanged.

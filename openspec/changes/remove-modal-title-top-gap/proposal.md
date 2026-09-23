## Why

Bare-A1 modal frames currently reserve a blank row between the top rule and the title. The gap is repeated by individual modal implementations, making every dialog taller and allowing the same chrome detail to drift between built-in, nested, and extension-hosted surfaces.

## What Changes

- Remove the empty row between a modal's top rule and its title so the title is the first content row in the frame.
- Make title-to-rule spacing a shared modal-component policy rather than deleting spacers independently in each dialog.
- Apply the shared policy to all titled bare-A1 modal families, including top-level, nested, authentication, startup, and extension-hosted dialogs.
- Preserve spacing below the title, content insets, shortcut alignment, borders, focus, navigation, and the explicit `a1 pi` comparison profile.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ui-components`: Require reusable modal chrome to place a title directly below its top rule without an intervening blank row.
- `owned-pi-ui-foundation`: Require every titled bare-A1 modal branch to receive the compact top-title geometry through the shared component boundary.

## Impact

Implementation will affect the shared modal presentation component or adapter, owned/source-synchronized Pi modal construction, modal inventory coverage, and focused render snapshots. Dialog content, title styling, bottom spacing, shortcut hints, controller transitions, installed Pi package code, persisted data, and `a1 pi` output remain unchanged. This change contains planning artifacts only.

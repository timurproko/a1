## Why

Dialog shortcut hints currently follow inconsistent horizontal geometry. In selectors such as Thinking Level, Models, and Skills, the hint begins at the content-row inset while the dialog heading begins farther left; other dialog families already place the heading and hint on the same left edge. Aligning the hint with the heading will make dialog chrome read as one frame instead of making controls look like another content row.

## What Changes

- Align every shortcut-bearing bare-A1 dialog hint row with that dialog's heading or title left edge, rather than with its list, form, or editor content inset.
- Apply the alignment to top-level, nested, startup, extension-hosted, and full-screen dialog surfaces while retaining each surface's existing header inset.
- Preserve shortcut wording, semantic key/action styling, wrapping or clipping, dialog height, navigation, focus, and actions.
- Keep ordinary shell surfaces and the explicit `a1 pi` comparison profile unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ui-components`: Define heading-relative placement for shared dialog shortcut rows without coupling semantic formatting to content indentation.
- `owned-pi-ui-foundation`: Require every bare-A1 dialog family to align shortcut hints with its own heading while preserving existing interaction and comparison behavior.

## Impact

Implementation will update shared dialog-panel geometry and the bare-A1 modal/full-screen producers that currently add content-oriented leading space, together with focused render snapshots and inventory coverage. Shortcut declarations, effective keybindings, semantic colors, commands, transitions, installed Pi package code, and persisted data remain unchanged. This change contains planning artifacts only.

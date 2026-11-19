## Why

Bare A1 currently presents `/share` with the pinned generic loader: it has no title, its combined `escape/ctrl+c cancel` hint does not match the semantic shortcut rows used by the other A1 dialogs, and it leaves an extra blank row above the lower rule. After the gist is created, the prompt-adjacent URLs remain muted instead of reading as the native blue links used elsewhere in the A1 viewport.

## What Changes

- Present the in-progress bare-A1 share operation as a standard titled modal with `Share` directly below the top rule.
- Render cancellation shortcuts through the shared dialog-hint style, aligned with the title, and place the hint row directly above the bottom rule.
- Keep the existing cancellable gist workflow and result wording while styling the generated viewer and gist URLs as blue native terminal hyperlinks with dashed idle decoration, solid hover decoration, and terminal Ctrl+click opening.
- Preserve the pinned `a1 pi` comparison presentation and all existing failure, cancellation, export, and gist-creation behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Declare the bare-A1 share dialog as an owned modal presentation and make successful share URLs visually and interactively consistent with native links.

## Impact

- Affects the Pi component façade for the share operation, bare-A1 workflow composition, and prompt-adjacent status link decoration.
- Adds focused component and session-shell regression coverage for modal geometry, shortcut styling, profile isolation, success links, cancellation, and URL targets.
- Adds no dependency, changes no share service protocol, and does not alter gist visibility, exported content, URL values, or the pinned comparison profile.

## Why

Autocomplete currently appears below bare A1's prompt, so opening the slash-command list or changing its height pushes the input upward and makes it jump back when the list closes. Suggestions should grow above the prompt instead, keeping the typing position steady.

## What Changes

- Place the ordinary bare-A1 editor's autocomplete list immediately above its upper border, rather than below its lower border.
- Give the visible menu a darker background across its full width, including padding and pagination, so it is visually separate from the transcript above. Keep labels, descriptions, and the active selection readable. This replaces the previously proposed top line: add no line, spacer, or extra row.
- Keep the prompt, caret, below-editor widgets, and footer at the same terminal rows when only autocomplete visibility or height changes; allocate list space upward from the transcript viewport.
- Preserve the existing menu's ordering, selection, descriptions, pagination, keyboard actions, asynchronous completion behavior, and `autocompleteMaxVisible` setting behavior. Apply the same placement to command, argument, path/resource, and extension-provided completions in the default editor.
- Retain existing menu sizing and terminal clipping behavior; do not add a new capacity budget, one-row menu mode, or special handling for zero available menu rows.
- Keep history behavior and the existing editor implementation chosen by each history mode unchanged. Leave extension-owned replacement editors, other menus/dialogs, `a1 pi`, and installed Pi packages unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `custom-session-viewport`: Above-prompt autocomplete placement with stable input coordinates and correct pointer/cursor geometry, using the existing sizing and clipping policy.
- `owned-pi-ui-foundation`: Declare autocomplete placement and its darker menu background as a bare-A1 presentation exception while preserving completion semantics and pinned comparison behavior.

## Impact

- Owned editor presentation in `src/integrations/pi/components/shell-editor-autocomplete.ts`, `upstream/components/owned-editor.ts`, and the editor UX/geometry boundary.
- Bottom-dock composition and editor pointer coordinates in `src/integrations/pi/session-ui/session-shell-root.ts` and its viewport integration.
- Owned menu background styling through the existing theme/presentation boundary.
- Focused editor, shell, terminal-cell, and comparison regression coverage; existing settings, history, selection, and extension contracts remain in force.
- No new dependency, configuration toggle, engine command, or storage format. This change's planning pull request contains only OpenSpec artifacts.

## Why

Autocomplete currently appears below bare A1's prompt, so opening the slash-command list or changing its height pushes the input upward and makes it jump back when the list closes. Suggestions should grow above the prompt instead, keeping the typing position steady.

## What Changes

- Place the ordinary bare-A1 editor's autocomplete list immediately above its upper border, rather than below its lower border.
- Keep the prompt, caret, below-editor widgets, and footer at the same terminal rows when only autocomplete visibility or height changes; allocate list space upward from the transcript viewport.
- Preserve suggestion ordering, selection, descriptions, pagination, keyboard actions, asynchronous completion behavior, and live `autocompleteMaxVisible` behavior. Apply the same placement to command, argument, path/resource, and extension-provided completions in the default editor.
- Bound the menu by available terminal space, prioritizing the existing input/footer allocation and keeping the active completion visible whenever a menu row fits.
- Cover both persistent-history modes without changing their history semantics. Leave extension-owned replacement editors, other menus/dialogs, `a1 pi`, and installed Pi packages unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `custom-session-viewport`: Above-prompt autocomplete allocation with stable input coordinates, constrained-terminal behavior, and correct pointer/cursor geometry.
- `owned-pi-ui-foundation`: Declare autocomplete placement as a bare-A1 presentation exception while preserving completion semantics and pinned comparison behavior.

## Impact

- Owned editor presentation in `src/integrations/pi/components/shell-editor-autocomplete.ts`, `upstream/components/owned-editor.ts`, and the editor UX/geometry boundary.
- Bottom-dock composition and editor pointer coordinates in `src/integrations/pi/session-ui/session-shell-root.ts` and its viewport integration.
- Focused editor, shell, terminal-cell, and comparison regression coverage; existing settings, history, selection, and extension contracts remain in force.
- No new dependency, configuration toggle, engine command, or storage format. This change's planning pull request contains only OpenSpec artifacts.

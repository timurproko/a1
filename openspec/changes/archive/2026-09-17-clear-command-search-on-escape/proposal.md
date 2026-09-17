## Why

Typing `/` in bare A1 opens the slash-command menu, but pressing Escape only closes the menu and leaves the lone `/` (or a partial command name) in the prompt. Users then have to delete it by hand before writing an ordinary prompt. The earlier A1 v2 hotkey set treated Escape on a sole top-level command search as "cancel and return to the empty prompt", which is what users expect.

## What Changes

- Make Escape on an open slash-command menu whose only editor content is a top-level command search (`/` followed by zero or more non-space, non-slash characters, cursor at the end) close the menu and clear the prompt in bare A1.
- Keep pinned Escape behavior everywhere else: argument, path/resource, and extension-provider menus, command searches that already carry a space or nested slash, multi-line content, and the `a1 pi` comparison profile still only close the menu.
- Declare the deviation in the pinned Pi source ledger and cover it with focused editor tests.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Carve the sole slash-command search out of the above-prompt autocomplete Escape-cancellation parity clause and require Escape to restore the empty prompt for that case in bare A1.

## Impact

- Affected areas: the owned editor's Escape handling, bare-A1 editor construction, the pinned source ledger entry for the owned editor, and focused autocomplete tests.
- No public API, dependency, session-format, keybinding, or comparison-profile changes are intended.

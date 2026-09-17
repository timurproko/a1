## Why

The bare-A1 Escape exception from `clear-command-search-on-escape` clears a sole slash-command search only when the text after the leading `/` contains no further `/`. The pinned command provider, however, treats every space-free prompt that starts with `/` as a command search and keeps the menu open for it, so typing `////////` (or any `/foo/bar`) opens the menu, and Escape then only closes the menu and leaves the slashes in the prompt. Users expect the same clear-to-empty result they get for `/` and `/mod`.

## What Changes

- Widen the sole top-level slash-command search definition so it matches the pinned provider: single-line content that is `/` followed by zero or more non-whitespace characters, including further `/`, with the cursor at its end and the menu open.
- Keep every other Escape path unchanged: searches with whitespace, argument, path/resource, and extension-provider menus, multi-line content, a cursor away from the end, and the `a1 pi` comparison profile still only close the menu.
- Cover the nested-slash case in the focused editor tests and refresh the pinned source ledger hash for the owned editor.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Replace the "neither whitespace nor `/`" character rule in the sole slash-command search requirement with "non-whitespace" and drop "a nested `/`" from the close-only list.

## Impact

- Affected areas: `isTopLevelCommandSearch()` in the owned editor, the focused autocomplete Escape test, and the pinned source ledger entry for the owned editor.
- No public API, dependency, session-format, keybinding, or comparison-profile changes are intended.

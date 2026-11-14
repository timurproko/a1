## Why

Settings section jumps and Agent transcript prompt jumps should use Ctrl+Shift+Up/Down instead of Shift+Up/Down. Agent input and Settings search also need consistent one-character left and right gutters on every input body row, including wrapped and explicit multiline drafts, implemented in the shared input component rather than screen-specific spacing.

## What Changes

- Move Settings previous/next section and Agent previous/next transcript anchor navigation to Ctrl+Shift+Up/Down, updating input decoding, shortcut declarations, and help hints together.
- Stop treating Shift+Up/Down as jump commands; preserve ordinary editing, history recall, and overlay input ownership. Remove obsolete Ctrl-only transcript-jump fallback aliases rather than leaving a second hidden jump shortcut.
- Give Agent prompt and Settings search one terminal-cell left and right gutters across their entire editable body height through shared input geometry and rendering.
- Keep full-width rules, existing marker policy, caret, wrapping, placeholder, selection, pointer targeting, copy semantics, and autocomplete alignment coherent with the inset. Do not accumulate duplicate component and editor padding; retain support for explicitly configured larger editor padding.
- Add focused shortcut and shared-input regression tests. Keep the independent `a1 pi` comparison route unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-ui-settings`: Ctrl+Shift+Up/Down section navigation and accurate active hints.
- `custom-session-viewport`: Ctrl+Shift+Up/Down prompt and completed-compaction navigation.
- `ui-components`: component-owned full-height one-cell input gutters.

## Impact

Owned Settings routing, session viewport input routing, effective Agent shortcut declarations/help, terminal key adaptation as needed, shared input presentation and editor geometry, and focused component/Settings/viewport tests. No new dependency, engine change, persistence migration, or change to submitted transcript content.

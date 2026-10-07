## Why

Resume Session currently explains its two special query forms in the shortcut footer, where the adjacent `regex` and `"phrase"` descriptions can read as one instruction and force the remaining controls onto a second line. Putting that guidance in the empty search field makes it visible at the point of use, while a comma clearly separates regex search from exact-phrase search and leaves the footer consistent with other searchable dialogs.

## What Changes

- Show `re:<pattern> regex, "phrase" exact` as quiet suggestion-style placeholder text in Resume Session's empty search input, with the active cursor cell remaining neutral white like Settings search.
- Replace the two-row ordinary footer with one semantic shortcut row ordered like other searchable dialogs: typing, navigation, selection, session-specific actions, then close.
- Keep state-specific feedback, narrow-width close preservation, search behavior, keybindings, and the explicit `a1 pi` comparison profile unchanged.
- Add focused rendering coverage for placeholder wording/style, footer order, one-row geometry, and populated-query behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Refine the bare-A1 Resume Session search guidance and ordinary shortcut layout.

## Impact

Expected implementation is limited to the owned Resume Session component, its focused tests, copied-source modification notes, and the corresponding owned Pi UI specification. No search semantics, keybindings, dependencies, persisted session data, or comparison-profile behavior change.

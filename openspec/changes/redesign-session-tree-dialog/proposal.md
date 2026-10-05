## Why

The session-tree workflow uses denser, older presentation than bare A1's Models dialog: extra outer spacing and an internal rule separate the content, search is rendered as instructional text instead of the standard input, selection paints the whole row, and shortcut help occupies the header. Its branch-summary transition also briefly restores the ordinary prompt before the next dialog appears.

## What Changes

- Recompose the Session Tree surface with the shared compact dialog frame, accent title, standard search input, menu-style selected row, and bottom shortcut footer.
- Remove the internal separator, redundant outer spacer, empty-result counter, and search-label text while retaining tree navigation, filters, folding, labels, copying, and horizontal clipping.
- Present message content as muted descriptive text, remove active-path bullets, distinguish user and assistant labels with green and yellow, render system without brackets, and use the same selected arrow as ordinary menus.
- Keep the search cursor after typed text and transition directly in both directions between the Session Tree and branch-summary choice without flashing the prompt; align nested-dialog footers without trailing blank rows.
- Replace the multiline custom-summary editor with the standard single-line input pattern, accent-bold title, and submit/cancel shortcut footer.
- Add focused rendering and workflow regressions for spacing, styling, empty search, typing, selection, footer placement, and transition continuity.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Define the standard bare-A1 visual and transition behavior for the Session Tree and its branch-summary choice.

## Impact

Expected implementation is limited to the bare-A1 tree selector, the shared extension selector and input used by the nested prompts, the session-shell tree transition, focused component/session-shell tests, and the copied-source provenance ledger. Tree semantics, keybindings, workflow outcomes, persisted filter mode, dependencies, public APIs, and the explicit `a1 pi` comparison profile remain unchanged.

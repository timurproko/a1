## Why

The session-tree workflow uses denser, older presentation than bare A1's Models dialog: extra outer spacing and an internal rule separate the content, search is rendered as instructional text instead of the standard input, selection paints the whole row, and shortcut help occupies the header. Its branch-summary transition also briefly restores the ordinary prompt before the next dialog appears.

## What Changes

- Recompose the Session Tree surface with the shared compact dialog frame, accent title, Models-style filter status, standard search input, menu-style selected row, and a bottom shortcut footer ordered like the Models dialog.
- Remove the internal separator, redundant outer spacer, empty-result counter, and search-label text while retaining tree navigation, filters, folding, labels, copying, and horizontal clipping; use PageUp/PageDown for paging, Home/End for first/last, and Left/Right for collapse/expand from any selected entry within a branch.
- Present message content as muted descriptive text, remove active-path bullets, render entry labels and bracketed label timestamps in accent, distinguish user and assistant labels with green and yellow, render the system root as muted `session`, and combine the ordinary menu arrow with the subtle purple active background.
- Reduce filters to `all | no tools | user | labeled`: make `all` the concise former-standard view, remove the raw-bookkeeping all/standard distinction, move forward cycling from `Ctrl+O` to `Tab`, and omit internal bookkeeping entries from rows and counters while keeping resolved labels on their targets.
- Present label editing as a focused compact state with a `Label` title, `Empty to remove` subheader, one input, and only save/cancel hints; hide tree search, results, and filter/navigation shortcuts while editing.
- Keep the search cursor after typed text and transition directly between the Session Tree, `Summarize Branch?`, and `Custom Summarization Instructions` in both directions without flashing the prompt; use title case and align nested-dialog footers without trailing blank rows.
- After navigation, rebuild the content area from the selected branch and restore the ordinary editor; populate it from Pi's returned user-message prompt when present, otherwise preserve its draft.
- Replace the multiline custom-summary editor with the standard single-line input pattern, accent-bold title, and submit/cancel shortcut footer.
- Add focused rendering and workflow regressions for spacing, styling, empty search, typing, page navigation, single-character ellipses on both clipped edges, preserved `…]` endings for bracketed tool rows, and complete selected-fragment highlighting, selection, footer placement, and transition continuity.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Define the standard bare-A1 visual and transition behavior for the Session Tree and its branch-summary choice.

## Impact

Expected implementation is limited to the bare-A1 tree selector, the shared extension selector and input used by the nested prompts, the session-shell tree transition, adapter reconciliation after in-place tree navigation, focused component/session-shell/engine tests, and the copied-source provenance ledger. Filter behavior outside the explicit model/thinking metadata exclusion, non-cycle keybindings, workflow outcomes, persisted settings, dependencies, public APIs, and the explicit `a1 pi` comparison profile remain unchanged.

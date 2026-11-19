## Why

The Resume Session selector still compresses its title, active scope, name filter, sort mode, and shortcut guidance into a dense header. That presentation duplicates the current-folder/all scope in the title and does not follow the title, filter-row, content, and bottom-footer hierarchy now established by the Session Tree and other bare-A1 modals.

## What Changes

- Render a standalone accent-bold `Resume Session` title without embedding the active scope in it.
- Place a dedicated status row immediately below the title: `Filter: current | all  Name: all|named  Sort: threaded|recent|fuzzy`, with active/current values styled consistently with other modal filters.
- Keep that filter row stable while all-session discovery runs; let the existing bottom `(selection/total)` paging count grow with the discovered matching items instead of showing `loading loaded/total` beside the active filter.
- Move the session selector's search syntax and action shortcuts out of the header and into a bottom footer aligned with the shared modal content inset, immediately above the bottom rule.
- Render the top and bottom rules with the standard dialog border role used by Session Tree and Models rather than the title accent color.
- Render every selected result with the Session Tree's `→` arrow, accent primary title, muted metadata, subtle purple selection color, and one full-width highlight; lay out session title, path, message count, and age in stable columns with independent truncation.
- Preserve scope switching, progressive result discovery, search, sorting, named filtering, path display, rename, deletion, selection, and cancellation behavior while updating focused rendering and shell workflow coverage.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Define the standard bare-A1 title, filter/status row, and bottom shortcut-footer hierarchy for the Resume Session selector.

## Impact

Expected implementation is limited to the bare-A1 session selector's semantic header/footer composition and focused component/session-shell tests. Session discovery, filtering semantics, keybindings, workflow outcomes, dependencies, public APIs, and the explicit `a1 pi` comparison profile remain unchanged.

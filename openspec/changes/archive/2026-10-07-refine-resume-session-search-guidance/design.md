## Context

See `proposal.md` for motivation. Resume Session currently uses a plain Pi TUI `Input` and renders `Type search  Tab scope  re:<pattern> regex  "phrase" exact` on the first footer row, with session actions and close on a second row. Pi TUI's public `Input` supports placeholder text and placeholder styling, while A1's existing search and prompt suggestions establish the quiet/faint visual treatment requested for noncommitted text.

## Goals / Non-Goals

**Goals:**
- Present the two special query forms inside the empty search field as `re:<pattern> regex, "phrase" exact`.
- Make the placeholder visually match A1's quiet search-suggestion treatment, while keeping the active reversed cursor cell neutral white like Settings search, and disappear as soon as a real query is entered.
- Consolidate the ordinary footer into one semantic shortcut row with the common searchable-dialog controls first and `Esc close` last.
- Preserve complete close guidance when the row is clipped at narrow widths.

**Non-Goals:**
- Changing fuzzy, regex, or exact-phrase matching semantics.
- Changing any keybinding, scope/filter state, selection action, feedback state, or result geometry.
- Reworking the shared input component or changing other searchable dialogs.
- Changing the explicit `a1 pi` comparison profile.

## Decisions

### Put query grammar in the search input placeholder

Construct Resume Session's search input with the exact placeholder `re:<pattern> regex, "phrase" exact`. The comma is ordinary placeholder content and makes the regex and quoted-phrase forms visibly separate. Apply the same quiet suggestion presentation used by existing search placeholders rather than styling this text as a shortcut key/action pair.

The placeholder remains noncommitted presentation: it is visible only while the query is empty, the caret stays on its first cell according to the input contract, and typing replaces it without placing any placeholder characters in the query. As in Settings search, quiet/faint styling applies only after the caret cell; the active reversed cell retains ordinary neutral-white input weight instead of inheriting the grey suggestion weight. Keeping the syntax in the footer as well was rejected because it would duplicate guidance and preserve the current two-line pressure.

### Use one semantic footer row in standard dialog order

The ordinary footer will use the shared semantic shortcut renderer and this order:

1. `Type search`
2. vertical navigation
3. `Enter select`
4. `Tab scope`
5. sort
6. named-only filtering
7. delete
8. path display with its current on/off state
9. rename when available
10. `Esc close`

This follows the common searchable-dialog sequence of search, navigation, confirmation, surface-specific actions, and close while preserving the existing relative order of Resume Session actions. The complete rendered row will pass through the existing close-preserving clipping helper so constrained widths remove earlier guidance before the canonical close suffix. Wrapping was rejected because the requested ordinary state is explicitly one line.

### Leave feedback states specialized

Delete confirmation, mutation status, and load errors will continue to replace the ordinary footer with their single feedback row and canonical close suffix. Moving query grammar into the field must not affect those transitions, and no placeholder is needed in rename mode because that mode owns a separate input and footer.

## Risks / Trade-offs

- **[The full ordinary row is long]** → Keep one row as requested and retain the existing close-first clipping policy; wide dialogs show the complete order while narrow dialogs still expose how to close.
- **[Placeholder styling could diverge from existing suggestions]** → Reuse the established quiet suggestion treatment after the caret, retain ordinary input weight on the active reversed cell, and assert both ANSI states in focused tests rather than choosing a new literal terminal color.
- **[Adding navigation and select guidance could drift from actual controls]** → Resolve displayed keys through the active keybinding manager and cover both wording and behavior in the existing selector suite.

## Migration Plan

No data migration is required. Apply the input, footer, provenance, and focused test updates atomically. Rollback restores the footer syntax hints and two-row ordinary footer without affecting sessions or settings.

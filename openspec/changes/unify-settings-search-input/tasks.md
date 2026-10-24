# Tasks

## 1. Establish the configurable shared input

- [ ] 1.1 Add focused component regressions for single-line and multiline configurations covering cursor movement, word jumps, deletion, selection extension, replacement typing, pointer drag, double-click word selection, triple-click logical-content selection, copy, cut, rendering, and narrow/wide text geometry.
- [ ] 1.2 Refactor the existing agent prompt interaction and shared presentation into one configurable input component without changing agent history, autocomplete, chips, submission, clipboard, paste, wrapping, or pointer behavior.
- [ ] 1.3 Add an explicit paste capability option at the component boundary; verify enabled agent paste retains clipboard and bracketed-paste behavior while disabled input consumes paste bindings and complete or fragmented terminal paste frames without changing text.

## 2. Migrate Settings search behavior

- [ ] 2.1 Replace Settings' independent `LineInput` editing path with the shared component configured as single-line, non-submitting, and paste-disabled; preserve filtering, cursor visibility, cancellation, result navigation, and framed layout.
- [ ] 2.2 Open Settings search from the first ordinary printable input and retain the exact typed content; remove the dedicated `/` activation action while preserving precedence for Settings navigation, adjustment, undo, and close shortcuts.
- [ ] 2.3 Change standing guidance to semantic `Type search` and the empty placeholder to exact `Search settings`; verify direct and resident Settings retain status ordering, clipping, and pinned-tab close policy.

## 3. Integrate selection, pointer, and clipboard boundaries

- [ ] 3.1 Route search-row press, drag, release, double-click, and triple-click reports through shared input geometry before list hit-testing while preserving wheel scrolling over the search footer.
- [ ] 3.2 Supply Settings with a bounded text-copy callback through owned route composition; verify `Ctrl+C` copies retained query selection without editing it and `Ctrl+X` copies then removes the selected text.
- [ ] 3.3 Add focused Settings and route-host regressions for word and whole-query selection, drag selection, select-all and selection replacement, copy/cut delivery, no-selection cancellation behavior, disabled paste, and unchanged list/value interactions.

## 4. Preserve product boundaries

- [ ] 4.1 Run focused shared-input, agent-editor, Settings, route-host, clipboard, and resident-input tests plus source typechecking and strict OpenSpec validation; record exact evidence and any reviewed known-gap disposition.
- [ ] 4.2 Verify paired bare-A1 and pinned `a1 pi` coverage shows the agent prompt retains all enabled capabilities, Settings alone disables paste, and comparison-profile input behavior remains unchanged.

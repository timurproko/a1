## 1. Separate prompt and content navigation

- [ ] 1.1 Route Ctrl+Home/Ctrl+End through the existing bare-A1 viewport pre-input boundary and editor terminal-key port, including no-op and before-first-frame cases; verify controller tests consume the Ctrl chords without passing them to the editor and preserve clamped beginning/end-follow behavior.
- [ ] 1.2 Restore unmodified Home/End to the prompt's existing logical-line navigation and adjust bare-A1 aliases only where needed; verify shell tests for single-line, multiline, and soft-wrapped drafts, unchanged transcript position/follow state, and preserved unrelated editing aliases.
- [ ] 1.3 Update shortcut fixtures by their intended input owner and add routing regression coverage; verify supported legacy/extended encodings, negative Shift/Alt-modifier cases, draft/cursor preservation during content navigation, fitting/empty/repeated-boundary cases, detached streaming, and Ctrl+End returning to the complete working-status tail.
- [ ] 1.4 Preserve alternate-surface and comparison ownership; verify selector/dialog, overlay, and replacement-input tests keep their events and comparison-profile tests retain existing bindings without an A1 viewport interceptor.

## 2. Align the bottom block and shortcut help

- [ ] 2.1 Change generic, singular, and plural bottom-control labels to the confirmed `(Ctrl+End) ↓` forms using plain U+2193 and existing padding/style; verify exact label text in normal and pointed-at states, unchanged message-count semantics, and disappearance on resumed following.
- [ ] 2.2 Preserve complete-label display-width geometry and narrow-width fallback/omission; verify tests for centered placement, clicks and hover on the arrow, clicks outside the target, stationary-pointer reveal, count/resize changes, and absence of overflow or invisible hit regions when the full label cannot fit.
- [ ] 2.3 Update bare-A1 shortcut help to reflect prompt Home/End and content Ctrl+Home/Ctrl+End; verify help assertions contain the new ownership and no misleading old mapping while comparison help remains unchanged.

## 3. Validate the integrated candidate

- [ ] 3.1 Obtain a passing required CI result for the implementation candidate and review the resulting diff for accidental upstream/comparison changes; verify the recorded CI result covers the updated viewport, shell-routing, label, and help regressions.
- [ ] 3.2 Present a built candidate for Windows Terminal/Git Bash acceptance and record the user's result for prompt navigation, content navigation with a preserved draft/cursor, streaming tail return, all three arrow labels, arrow clicks, and unchanged modal input; verify acceptance refers to the exact candidate commit before requesting implementation merge.

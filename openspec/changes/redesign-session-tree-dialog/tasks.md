## 1. Align the Session Tree Presentation

- [x] 1.1 Recompose the bare-A1 tree frame without its leading spacer or internal separator, style the title as accent-bold, place the shared shortcut hints at the bottom without a trailing frame gap, and verify focused render coverage pins one transcript gap, compact chrome, full-width outer rules, and heading/footer alignment.
- [x] 1.2 Render the tree query through a focused standard input while preserving the tree list's action-first key dispatch and authoritative query state; keep the cursor after typed text and verify typing, deletion, clearing, text color, prompt icon, cursor/focus propagation, filtering, and narrow-width clipping.
- [x] 1.3 Replace whole-row tree selection with the menu arrow, highlighted primary label, muted message description, green user label, yellow assistant label, and unbracketed system label; remove active-path bullets while retaining hierarchy, labels, filters, and horizontal-viewport semantics, and verify raw ANSI roles and selected/unselected geometry.
- [x] 1.4 Remove the empty-result `(0/0)` counter while preserving `No entries found` and filter-status behavior; verify empty query results and non-empty overflow/status counters independently.

## 2. Make Nested Tree Transitions Compact

- [x] 2.1 Replace the tree directly with the branch-summary choice when prompting is required, keep the summary mounted until the tree is ready on cancellation, and close before skipped-prompt navigation; verify neither transition exposes the ordinary prompt and cancellation restores the selected tree entry.
- [x] 2.2 Remove the shared extension selector's trailing blank footer row so the summary-choice hint is immediately followed by its bottom rule; verify summary options, navigation, selection, cancellation, shared hint styling, and inventoried modal-frame coverage remain intact.
- [x] 2.3 Replace the multiline custom-summary editor with the standard single-line extension input, accent-bold title, submit/cancel hints, and no trailing footer gap; verify custom-summary submission and compact frame geometry.

## 3. Validate the Delivered Experience

- [x] 3.1 Run the focused tree, session-shell workflow, extension-selector, modal-inventory, and typecheck/build scopes permitted by repository policy; record passing behavior and any explicit gap disposition in `evidence/validation.md`.
- [ ] 3.2 Build the interactive candidate and obtain maintainer review in bare A1 for the supplied spacing, title, search, selection, empty-state, footer, and no-flash summary scenarios; record the physical result in `evidence/validation.md` before finalization.

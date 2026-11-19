## 1. Reproduce the disappearing-suggestion transition

- [x] 1.1 Add a deterministic production-path regression that starts with a visible delivered suggestion, dispatches typing and deletion through owned input coordination, and captures controller state, semantic editor text, autocomplete ownership, render requests, and emitted frames when the draft returns to empty.
- [x] 1.2 Cover repeated Backspace, a configured whole-draft deletion action, and the shell clear shortcut, including a draft that activates autocomplete; identify and record the exact state or presentation transition that causes the report.

## 2. Restore the retained suggestion

- [x] 2.1 Repair the narrow editor/autocomplete, shell lifecycle, or presentation invalidation boundary demonstrated by the regression so every supported draft-removal path reevaluates the empty editor and repaints the original suggestion in the same presentation cycle.
- [x] 2.2 Preserve lifecycle boundaries: pending generation is canceled by edits, delivered state survives only transient draft edits, autocomplete retains priority while legitimately active, and acceptance, submission, new runs, session/model changes, replacement input, disablement, interruption, and disposal still retire the suggestion.
- [x] 2.3 Verify restoration starts no additional suggestion request, emits no duplicate terminal diagnostic outcome, and allows Tab to accept the original text without submitting it.

## 3. Validate the regression repair

- [x] 3.1 Extend focused owned-editor tests for empty transitions and autocomplete cleanup, controller tests for retained-state ownership, and shell/runtime tests for actual input dispatch and frame repaint; include a negative case proving submission does not restore the old suggestion.
- [x] 3.2 Run the focused suites plus build, typechecking, architecture and code-documentation checks, strict validation of this OpenSpec change, and whitespace checks; record exact results and any known gaps without running forbidden local broad test tiers.
- [x] 3.3 Prepare the exact built candidate handoff for interactive verification that typing over a suggestion hides it, deleting the complete draft restores it immediately, and Tab accepts it.

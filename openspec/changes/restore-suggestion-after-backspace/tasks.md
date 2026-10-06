## 1. Reproduce the Backspace failure

- [ ] 1.1 Add a deterministic regression that starts with a visible unaccepted suggestion, types a multi-character draft through production terminal input, and removes it one Backspace at a time.
- [ ] 1.2 Capture controller state, semantic editor text, autocomplete ownership, render invalidation, and emitted terminal frames to identify the exact transition that prevents restoration.

## 2. Restore the retained suggestion

- [ ] 2.1 Repair the narrow suggestion lifecycle, editor input, autocomplete synchronization, or frame-presentation boundary demonstrated by the regression.
- [ ] 2.2 Ensure the final Backspace restores the same suggestion immediately while intermediate nonempty drafts keep it hidden and leave ordinary input behavior unchanged.
- [ ] 2.3 Preserve invalidation after acceptance, submission, new-run start, session/model or input-surface replacement, feature disablement, and disposal.

## 3. Verify behavior and delivery

- [ ] 3.1 Extend focused coverage for multi-character Backspace restoration, actual terminal-frame emission, one generation and diagnostic outcome, Tab acceptance, and true lifecycle invalidation.
- [ ] 3.2 Run focused suggestion/editor/runtime tests plus bounded type, architecture, documentation, build, strict OpenSpec, and whitespace validation; record results and known-gap disposition.
- [ ] 3.3 Build the candidate and prepare an interactive handoff that verifies typing hides the suggestion, repeated Backspace restores it after the final character, and Tab accepts it.

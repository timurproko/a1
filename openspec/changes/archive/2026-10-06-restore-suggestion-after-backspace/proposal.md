## Why

A visible contextual prompt suggestion still disappears permanently when the user types an unaccepted draft and removes it with Backspace, even though the ordinary prompt is empty again. The existing specification and regressions require restoration, so this is a remaining production-path defect rather than a change to suggestion policy.

## What Changes

- Reproduce the real terminal-input sequence from a visible suggestion through ordinary typing and repeated Backspace deletion, observing suggestion ownership, editor text, autocomplete state, and emitted frames.
- Repair the narrow lifecycle or presentation boundary that loses or fails to repaint the retained suggestion when Backspace empties the draft.
- Keep the suggestion hidden while user text exists, then restore that same suggestion immediately when the last character is removed, without generating again or duplicating diagnostics.
- Preserve existing invalidation after acceptance, submission, a new run, session/model replacement, feature disablement, input-surface replacement, or disposal.
- Add regression coverage that exercises production input dispatch and terminal presentation, including multi-character drafts removed one Backspace at a time.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `contextual-prompt-suggestions`: make Backspace restoration reliable through the production input and repaint path when an unaccepted draft returns to empty.

## Impact

Likely implementation boundaries are the owned editor input adapter, session-shell suggestion coordination, and custom viewport render invalidation. Focused tests will cover the shell/runtime terminal path; suggestion generation, filtering, settings, persistence, autocomplete priority, comparison mode, and submission semantics remain unchanged.

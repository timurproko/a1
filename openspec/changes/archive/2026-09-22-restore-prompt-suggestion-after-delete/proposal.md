## Why

A contextual prompt suggestion can disappear permanently after the user types a draft and then deletes that draft, even though the editor is empty again. This breaks the intended Claude Code-style interaction: a delivered suggestion should be hidden only while user text owns the prompt and should become available again when that text is removed.

The current specification and source already describe retention across draft edits, and focused component tests cover one-character Backspace and the clear shortcut. The report therefore indicates a regression or an uncovered input/presentation route rather than a request to change suggestion-generation policy.

## What Changes

- Trace the real owned-input route from a visible suggestion through typing, draft deletion, autocomplete cleanup, editor-change notification, and terminal repaint to identify where retained suggestion state or presentation eligibility is lost.
- Keep a delivered suggestion independent from transient draft visibility. While text exists it remains hidden and cannot own Tab or submission; once the same editor becomes empty through a deletion or clear action, it reappears immediately without another model request or diagnostic outcome.
- Ensure draft-owned autocomplete relinquishes presentation and Tab ownership when deletion returns the prompt to an empty state, so stale completion state cannot continue to mask the retained suggestion.
- Preserve the existing invalidation boundaries: accepting or submitting, beginning another run, interrupting the agent/session, changing model or session, replacing the input surface, disabling suggestions, and disposal still retire the suggestion.
- Add regression evidence through production-like key dispatch and rendered-frame paths, not only direct component rendering, for ordinary Backspace, whole-draft deletion, and the configured clear action.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `contextual-prompt-suggestions`: reliably restore a delivered ghost suggestion after every supported draft-removal path empties the ordinary prompt, including cleanup of draft-owned autocomplete and a real repaint.

## Impact

Likely implementation boundaries are the owned editor's deletion/autocomplete lifecycle, the session shell's editor-change and suggestion surface wiring, and input/render integration tests under `test/app/session-shell` and `test/integrations/pi/components`. Suggestion generation, candidate filtering, settings, persistence, diagnostics schema, comparison mode, and submission semantics remain unchanged.

## Why

In bare A1 the first character typed into the prompt discards a contextual suggestion for good: deleting that character leaves an empty editor with no ghost text, and nothing brings the suggestion back until another eligible run completes. Claude Code keeps the delivered suggestion and only hides it while the input holds text, so a user who starts typing, changes their mind, and clears the draft still sees the offer and can accept it with Tab. A1 should behave the same way.

## What Changes

- Typing, pasting, deleting, or clearing the draft still aborts a suggestion request that is in flight, but no longer discards a suggestion that has already been prepared or shown. While the editor holds text the suggestion is not painted and Tab and Enter act on the draft; when the editor becomes empty again the same suggestion reappears in the same presentation cycle.
- The clear shortcut on a nonempty draft (the first `Ctrl+C` press) behaves like any other draft edit: the editor empties and the suggestion reappears. Submitting, accepting, starting or continuing a run, interrupting, changing model, replacing or clearing the session, disabling the feature, replacing the input surface, and disposing the shell still clear it.
- `ContextualPromptSuggestionController` gains `abortPending()`, which retires a generating request with the existing `cancelled` outcome and leaves a `prepared` or `available` suggestion in place; the shell's editor-change and clear paths call it instead of `invalidate()`.
- The owned editor stops dropping its suggestion when text is set to a nonempty value; presentation, Tab acceptance, and the Enter no-op keep their existing empty-editor gates.
- Diagnostics are unchanged: a suggestion hidden behind a draft and shown again is one `displayed` outcome.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `contextual-prompt-suggestions`: draft edits abort pending generation but keep a delivered suggestion, which is hidden while the editor holds text and reappears when it is empty.

## Impact

`src/app/session-shell/prompt-suggestion-controller.ts`, `src/app/session-shell/session-shell.ts`, `src/integrations/pi/components/upstream/components/owned-editor.ts`, and their suites (`prompt-suggestion-controller.test.ts`, `session-shell-suggestions.test.ts`, `shell-components.test.ts`). No contract, setting, diagnostic record, or `a1 pi` comparison change. A suggestion that arrives while the editor already holds a draft is still discarded at presentation as `presentation-blocked`/`draft`, matching Claude Code's timing suppression.

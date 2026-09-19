# Design

## Hide, do not discard

Claude Code stores the delivered suggestion once and derives visibility from the input: `inputValue.length > 0` hides it, submission resets it. A1 already has the second half of that split. The owned editor keeps the suggestion text beside the buffer and paints it only when `canPresentPromptSuggestion()` holds, which requires an empty, focused, enabled prompt-mode editor with no autocomplete open; Tab acceptance and the Enter no-op share that gate. What discards the suggestion today is not presentation but two eager resets: the shell answers every editor change with `controller.invalidate()`, which clears the surface, and the editor's `setText` override drops its suggestion whenever the new text is nonempty. Removing both leaves the editor as the single place that decides whether the suggestion is visible, and an emptied draft repaints it with no new controller transition.

## What a draft edit still cancels

Typing during generation keeps its current meaning: the request is retired as `cancelled` and its late result is discarded, which is also what Claude Code's `abortPromptSuggestion` does. The controller therefore gains one narrow entry, `abortPending()`, that acts only on the `generating` state. A `prepared` result (received before the run settled) is left alone; if the draft is still there at settlement, the existing presentation check reports `draft` and discards it as `presentation-blocked`, and if the draft was cleared first it shows normally. An `available` suggestion is left alone and stays hidden behind the draft.

`clearOrExit` moves to the same entry. Its first press empties the draft, which is a draft edit; its second press within 500 ms shuts the shell down, which disposes the controller anyway. Every other `invalidate()` caller (submit, accept, run start, interrupt, retry, compaction, model change, session replacement, setting change, input-surface replacement, dispose) is a genuine end of the suggestion's life and is unchanged.

## Why the editor keeps the text

Keeping the suggestion in the editor rather than re-presenting it from the controller means no render-time callback into the shell and no second `displayed` diagnostic for the same candidate. The editor's `setText` override is removed outright: Tab acceptance nulls the suggestion explicitly before installing the accepted text through the base editor, so the accepted text is never painted twice.

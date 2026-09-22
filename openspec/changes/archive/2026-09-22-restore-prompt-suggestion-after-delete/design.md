## Context

The canonical `contextual-prompt-suggestions` requirement already says that typing over a shown suggestion hides rather than discards it and that deleting the draft makes the same suggestion reappear. The current controller exposes `abortPending()` for editor edits, the owned editor stores suggestion text separately from its semantic buffer, and focused tests directly render the editor after a one-character Backspace or `clearOrExit()`.

The user still observes permanent disappearance. Planning inspection found two coverage weaknesses that can conceal the defect:

1. the existing shell assertion calls `editor.render()` directly instead of proving the runtime requests and emits a changed frame after real input dispatch; and
2. the pinned editor updates autocomplete explicitly after character deletion but some whole-draft deletion actions only notify `onChange`, so completion state can continue to block `canPresentPromptSuggestion()` after semantic text becomes empty.

These are investigation leads, not a claim that either is the sole cause. Implementation starts by reproducing the report through the production input and frame path and records the exact failing transition before selecting the smallest repair.

## Goals / Non-Goals

**Goals:**
- Restore the same delivered suggestion immediately whenever a transient draft is deleted back to an empty ordinary prompt.
- Cover character-by-character and whole-draft deletion, including draft-owned autocomplete and terminal repaint behavior.
- Keep one suggestion generation and one terminal diagnostic outcome across hide/reveal cycles.

**Non-Goals:**
- Generate a replacement suggestion after the user edits the prompt.
- Show suggestion suffixes alongside a nonempty draft or merge user text into the suggestion.
- Restore a suggestion after submission, acceptance, a new run, session/model replacement, feature disablement, or disposal.
- Change comparison-mode behavior, keybindings, suggestion filtering, or persistence.

## Decisions

### 1. Treat delivered suggestion state and visibility as separate concerns

A prepared or available suggestion remains owned by the suggestion lifecycle until an established invalidation event occurs. Draft edits may cancel only generation still in flight. Visibility is derived from the current ordinary-editor state: empty, focused, enabled, prompt mode, and no active autocomplete.

When text becomes nonempty, the suggestion is hidden and Tab/submit retain ordinary draft behavior. When an edit makes the text empty again, eligibility is reevaluated in that same input/presentation cycle and the retained suggestion is requested for repaint. This must not call the generator again or emit a second `displayed` diagnostic.

### 2. Empty-editor transitions close draft-owned completion state before reveal

Deletion actions that mutate editor text must leave autocomplete consistent with the resulting cursor and text. If the prompt becomes empty, slash/path/resource/extension completion state created by the removed draft is canceled before suggestion presentation eligibility is evaluated. Autocomplete still has priority whenever it is legitimately active for nonempty input.

The repair should be centralized in the editor mutation/autocomplete boundary rather than special-casing one raw key sequence in the suggestion controller. This covers configured keys and programmatic whole-draft clears without allowing suggestion code to inspect private completion objects.

### 3. Prove behavior through real dispatch and presentation

Add a deterministic shell/runtime regression fixture that begins with a visible suggestion, dispatches ordinary typing and each supported removal action through the same route used by terminal input, and observes emitted presentation after each transition. At minimum it covers repeated Backspace, delete-to-line-start or the configured whole-draft deletion action, and the shell clear shortcut. Include a draft that activates autocomplete so the empty transition proves stale completion ownership is gone.

Assertions verify:
- the typed draft is the only semantic editor text while present;
- no ghost suggestion is painted while text or valid autocomplete owns presentation;
- the original suggestion is painted after the draft becomes empty;
- Tab then accepts exactly that suggestion without submitting it;
- generation occurs once and diagnostics do not gain a second display outcome; and
- submission or another true invalidation prevents later restoration.

Keep focused editor tests for mutation/completion state and controller tests for lifecycle ownership. Direct `render()` checks remain useful component evidence but are not sufficient alone for this regression.

## Implementation Result

The production input regression confirmed the uncovered transition: after `/` opened autocomplete, the configured delete-to-line-start action made semantic editor text empty but left `promptSuggestionPresentationBlockReason()` at `autocomplete`. The retained suggestion still existed, but the stale menu continued to mask it. Debounced autocomplete had the same ownership risk because deletion did not cancel its timer.

The adapter now detects a bare-A1 input transition from a nonempty draft to empty and reapplies the already-empty value without a duplicate semantic change notification. Pi's public `setText` boundary cancels both visible and pending autocomplete, after which the existing retained suggestion becomes eligible and the coordinated render paints it. The comparison profile is excluded. Focused evidence covers visible and debounced completion, persistent-history and non-history editors, ordinary Backspace, the clear shortcut, the actual terminal frame, one generation/display outcome, and Tab acceptance.

## Risks / Trade-offs

- **Autocomplete is canceled too aggressively.** Restrict cancellation to completion state derived from removed input; retain normal completion priority and update behavior for nonempty drafts.
- **A repaint fix masks lost suggestion state, or vice versa.** Assert controller state, semantic editor value, completion visibility, render request, and emitted frame separately around the failing transition.
- **Programmatic clears accidentally revive stale suggestions after submission.** Preserve full invalidation before submit/run/session lifecycle changes and add a negative regression assertion.
- **Configured keybindings differ from raw test bytes.** Dispatch named configured actions through the production classifier/keybinding route where possible and retain narrow component cases for mutation details.

## Known Gaps

None. Interactive terminal confirmation remains the maintainer acceptance step, not an undispositioned implementation gap.

## Migration Plan

1. Reproduce and classify the failing empty transition on the fresh implementation base.
2. Repair the narrow editor/autocomplete, shell lifecycle, or repaint boundary shown by that evidence.
3. Run focused controller, editor, shell, and input/presentation regressions plus repository type, architecture, documentation, build, and strict OpenSpec validation.
4. Hand off the built candidate for an interactive check in the user's terminal. No stored session or settings migration is required.

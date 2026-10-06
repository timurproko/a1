## Context

The canonical `contextual-prompt-suggestions` specification already requires a shown suggestion to survive transient draft edits and reappear after deletion returns the editor to empty. The controller's `abortPending()` retains an available suggestion, the owned editor stores ghost text outside semantic editor text, and the input adapter currently attempts to synchronize autocomplete on nonempty-to-empty transitions.

Focused tests cover a one-character Backspace followed by direct editor rendering, but the user still reproduces permanent disappearance with Backspace without first accepting the suggestion. The remaining investigation therefore needs to follow production terminal dispatch and emitted-frame behavior rather than assume retained controller state guarantees visible restoration.

## Goals / Non-Goals

**Goals:**
- Reproduce the reported unaccepted-suggestion, typed-draft, repeated-Backspace sequence through production input coordination.
- Restore the original ghost suggestion in the same presentation cycle that removes the final draft character.
- Keep semantic text, autocomplete ownership, model-request count, and diagnostics correct across hide/reveal transitions.
- Prove the terminal receives the restored frame rather than relying only on a direct component render.

**Non-Goals:**
- Restore a suggestion after it was accepted, submitted, or invalidated by another lifecycle event.
- Generate a replacement suggestion after draft editing.
- Display ghost text alongside a nonempty draft.
- Change keybindings, comparison-mode behavior, generation eligibility, filtering, or persistence.

## Decisions

### 1. Reproduce the exact Backspace path before selecting the repair

Add a deterministic regression that starts with a delivered suggestion, dispatches a multi-character draft through the terminal input route, removes it one Backspace at a time, and inspects each transition. The regression will distinguish loss of controller ownership, stale editor/autocomplete state, missing render invalidation, and a frame-diff/emission failure.

The implementation will repair only the demonstrated boundary. Existing direct-render coverage remains useful component evidence but does not substitute for emitted terminal output.

### 2. Keep suggestion ownership independent from draft visibility

Typing over an available suggestion may cancel generation still in progress but must not retire the delivered suggestion. While draft text exists, ordinary text owns rendering, Tab, and submission. Once Backspace removes the final character and autocomplete has synchronized, the retained suggestion becomes presentable again without calling the generator or recording another `displayed` outcome.

Acceptance, submission, new-run start, model/session replacement, replacement input, feature disablement, and disposal continue to invalidate the suggestion.

### 3. Coordinate empty transition and repaint atomically

The final Backspace transition must leave semantic editor text empty, close any completion state owned by the removed draft, reevaluate suggestion presentation, invalidate the correct rendering layer, and emit the restored prompt frame. The repair should use an explicit owned boundary rather than depend on incidental direct rendering or private Pi state.

Regression assertions will verify the same suggestion text returns, generation occurs once, no duplicate terminal outcome appears, Tab accepts without submitting, and a true lifecycle invalidation prevents later restoration.

## Risks / Trade-offs

- **The new path duplicates prior autocomplete synchronization.** Keep one owner for nonempty-to-empty coordination and remove or reuse redundant behavior rather than layering key-specific workarounds.
- **Extra invalidation causes unnecessary frames.** Restrict it to an available retained suggestion becoming eligible after the final deletion and assert bounded output.
- **Backspace repair revives invalidated suggestions.** Test both retained draft edits and negative acceptance/submission lifecycle cases.
- **The regression passes only through direct state inspection.** Require terminal write/frame evidence after the final Backspace.

## Known Gaps

The exact failing boundary is not yet established because current focused tests assert the intended result. Implementation begins with the production-path reproduction and records the observed transition before changing code.

## Migration Plan

1. Add and run the exact terminal Backspace reproduction on the approved implementation base.
2. Repair the narrow suggestion, input, autocomplete, or rendering boundary demonstrated by that failure.
3. Run focused suggestion/editor/runtime tests and bounded repository validation.
4. Build and hand off the candidate for interactive verification in the maintainer's terminal. No data or settings migration is required.

## Context

See `proposal.md` for motivation. `TranscriptViewport.scrollToNextPrompt` currently returns false when its anchor search finds no later prompt; the existing unit test explicitly expects that terminal no-op. `scrollToEnd` already owns the complete bottom transition, including follow state, pending-message reset, and scroll activity. `SessionViewportController.handlePreInput` routes supported Shift+Down encodings to next-prompt navigation and schedules rendering when it reports a change.

A short design resolves the boundary cases before implementation: a response-tail position with no later prompt is equivalent to the last-prompt stop for forward navigation, while a transcript without any prompts retains its current behavior.

## Goals / Non-Goals

**Goals:**
- Keep navigation policy in the viewport and reuse its canonical bottom transition.
- Preserve the existing boolean change signal used by the input controller for rendering.

**Non-Goals:**
- No remembered navigation cursor, extra synthetic prompt anchor, new keybinding, or settings toggle.
- No change to selection semantics, editor history, settings-section shortcuts, reverse navigation, or the pinned comparison UI.

## Decisions

### Reuse the existing bottom transition in the no-next-anchor case

Retain the no-anchor early return, first-prompt spacer handling, and next-anchor search. When the search has no target, use `scrollToEnd(now)` rather than returning false. Continue to use the current clamped prompt scroll when a target exists.

This keeps position, follow state, new-message count, activity timing, and return value consistent with End without duplicating them. A controller-level fallback was considered but would split navigation semantics between the controller and viewport and could unintentionally change the no-anchor behavior. A synthetic bottom anchor was rejected because it would pollute sticky-prompt and reverse-navigation semantics.

### Preserve boundary semantics without adding navigation state

The bottom is an additional destination, not an additional stored prompt. Shift+Up continues to find the nearest earlier anchor by scroll position. If a prompt target clamps to the bottom, existing scrolling already resumes following; no duplicate stop is needed. Repeated Shift+Down at the bottom remains a no-op as a navigation transition.

Assumption: the requested last-prompt behavior also covers a detached position inside the final response. This uses the same no-later-anchor condition rather than requiring exact row equality. With zero anchors, retain the current no-op rather than introducing unrelated navigation behavior.

### Keep input routing intact

Use the existing controller handling and supported key encodings. Do not add a separate End-key dispatch or bypass modal guards. Regression tests should verify that a changed navigation result requests a render, that keys remain consumed in the active viewport, and that modal/disabled paths still pass through.

## Risks / Trade-offs

- [A visual bottom jump might leave follow mode detached or stale new-message state] → Reuse `scrollToEnd` and assert equivalence with End plus behavior after appended output.
- [First-prompt spacer or clamped anchors could introduce duplicate stops or wrapping] → Cover single-prompt, multi-prompt, fitting-transcript, and repeated-bottom cases.
- [Existing tests encode the terminal no-op] → Update that expectation and extend the same sequence through bottom, reverse navigation, and forward return.
- [A viewport-only test could miss key routing or repaint regressions] → Add controller/session integration coverage for supported Shift+Down inputs and existing ownership guards.

## Migration Plan

No persistent data or configuration migration is needed. Deliver the viewport change and regression tests together after this proposal is accepted. Rollback consists of reverting that implementation; existing prompt and End navigation remain available.

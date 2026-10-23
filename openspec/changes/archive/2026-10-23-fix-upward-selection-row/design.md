## Context

See `proposal.md` for motivation. Bare A1 owns complete-frame selection and stores pointer endpoints in one-based terminal rows before normalizing them to zero-based frame lines. Reverse selection already uses inclusive grapheme endpoints, but the upper transcript boundary can project the moving endpoint onto the following content row. This appears as one missing top row even though the pointer stopped over that row.

Prompt/editor interaction has separate ownership rules. Correcting transcript row projection must not turn a pointer outside transcript content into a synthetic prompt selection or alter no-drag prompt click behavior.

## Goals / Non-Goals

**Goals:**

- Make upward selection include the exact transcript content row under the pointer.
- Preserve the pointer column as the partial top-row boundary under standard reverse-selection semantics.
- Keep selection paint and copied text derived from the same corrected endpoint.
- Preserve transcript edge auto-scroll, sticky-row clipping, and prompt/editor gesture ownership.

**Non-Goals:**

- Selecting an additional row beyond the pointer.
- Changing inclusive grapheme, word, line, or clipboard normalization semantics.
- Changing prompt keyboard selection, controls, overlays, regular mode, or `a1 pi`.

## Decisions

### 1. Correct the endpoint at the frame-to-transcript boundary

Represent the moving endpoint using the actual selectable transcript row addressed by the pointer. Apply any boundary translation once, before selection normalization, so reverse ordering does not introduce a second row shift. The correction will be constrained to the transcript content boundary rather than changing shared text-selection ordering for all surfaces.

Changing generic reverse-range normalization was rejected because its row ordering is already symmetric and covered across transcript and dock surfaces. Adding a full extra row after normalization was rejected because it would over-select when the pointer is already on ordinary content.

### 2. Preserve partial-row semantics and prompt exclusion

The corrected top row remains an endpoint row: selection begins at the pointed grapheme and continues toward the lower anchor. It does not become an interior full-width row merely because the drag direction is upward. If a prompt/editor row is outside the eligible transcript region, clipping retains that ownership boundary and uses the first pointed content row instead of painting prompt text.

Clamping every upward endpoint to column one was rejected because it would select text left of the cursor and diverge from standard selection. Allowing the correction to cross into prompt rows was rejected because prompt gestures have distinct pending-click and editor-selection behavior.

### 3. Assert visual and copied boundaries

Focused tests will compare forward and reverse drags over the same transcript cells, assert the top selected row and exact partial-row columns, and verify copied text matches painted content. Controller-level coverage will reproduce an upward drag at the content/prompt boundary and confirm no prompt row receives frame-selection paint.

## Risks / Trade-offs

- **[Risk] Correcting the row could interfere with held-at-edge auto-scroll.** → Cover the initial motion and repeated auto-scroll ticks separately, asserting monotonic transcript expansion with the endpoint still attached to pointed content.
- **[Risk] Sticky transcript presentation could be mistaken for selectable prompt chrome.** → Retain existing first-selectable-row and source-anchor rules and test both ordinary and sticky top boundaries.
- **[Risk] Paint and copy could use different projections.** → Keep one corrected selection endpoint and assert both outputs from the same gesture.

## Migration Plan

1. Add failing viewport and controller regressions for the upward top-row boundary.
2. Correct transcript endpoint projection without changing shared prompt or comparison-profile behavior.
3. Run focused selection tests and typechecking, then hand off a Windows Terminal/Git Bash gesture check through `./scripts/dev`.
4. Roll back by restoring the prior transcript endpoint projection; no persisted data or settings migration is required.

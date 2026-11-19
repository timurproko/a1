## Context

See `proposal.md` for motivation. The custom viewport currently starts complete-frame selection on every primary press over an ordinary prompt row and remembers that the same coordinates may instead be an editor click. On release without movement, it clears the frame selection and replays the press/release pair to the editor. This preserves prompt-to-frame dragging, but any presentation between press and release can expose the viewport's provisional multi-click selection before the editor's text-bounded selection replaces it.

The ordinary editor already owns word and logical-line selection semantics. The complete-frame selector separately owns transcript and cross-surface drag semantics. Pointer ownership must remain singular for the complete gesture, and prompt-originated drags must still be able to cross into other frame regions.

## Goals / Non-Goals

**Goals:**

- Prevent any provisional complete-frame selection from being composed for a no-drag prompt click sequence.
- Preserve the editor's existing single-, double-, and triple-click interpretation.
- Promote the gesture from pending prompt click to frame selection on the first distinct motion, anchored at the original press cell.
- Keep ownership, copying, modal/control routing, and render scheduling deterministic if another frame is composed while the button is held.

**Non-Goals:**

- Changing editor word boundaries, line-selection semantics, colors, clipboard behavior, or keyboard selection.
- Changing transcript double-click/triple-click behavior or complete-frame selection geometry.
- Changing right-click paste, links, controls, modal surfaces, regular mode, or `a1 pi`.

## Decisions

### 1. Defer frame-selection admission for an editor press

When a primary press lands in the ordinary editor, retain its original frame coordinates as a pending editor gesture but do not call the complete-frame selection press path. A release at the same coordinates replays the complete press/release sequence to the editor exactly as today. Because no viewport selection exists while the gesture is pending, periodic, streaming, or pointer-triggered composition has no provisional range to paint or copy.

Masking viewport selection only during composition was rejected because the hidden semantic selection would still affect selection revisions, copy eligibility, and other routing decisions. Forwarding the press immediately to the editor was rejected because the editor would then own later motion and prevent the established prompt-to-frame drag promotion.

### 2. Promote on the first distinct motion from the stored origin

If motion differs from the pending press coordinates, initialize complete-frame selection at the stored origin, extend it to the current pointer cell in the same input turn, and discard the pending editor replay. Subsequent motion and release continue through the existing frame-selection owner, including cross-region movement, auto-scroll, copy-on-select, and control suppression.

The viewport's multi-click tracker will not receive no-drag editor clicks. This is intentional: those clicks belong semantically to the editor, while a promoted editor-origin drag begins as an ordinary point drag. Sharing click counts between the independent editor and frame selectors was rejected because it recreates the provisional word/full-row state and couples unrelated semantic owners.

### 3. Validate intermediate frames, not only settled selection

Focused session-shell coverage will inspect frames after prompt presses and before releases, including repeated clicks and a forced intervening composition. It will then verify the settled editor word and logical-line ranges. Separate cases will move from the prompt into another row and prove that promotion still creates one frame selection while transcript multi-click selection remains unchanged.

A final-only clipboard assertion was rejected because the defect is transient presentation: the settled editor selection and copied text can already be correct while an earlier frame flashes across the row.

## Risks / Trade-offs

- **[Risk] Deferring admission could lose the original drag anchor.** → Store the exact press cell and seed frame selection from it before processing the first distinct motion.
- **[Risk] A no-motion release could be replayed twice or omitted during ownership changes.** → Keep one pending-gesture latch, clear it on promotion, reset, modal/input-surface handoff, and release, and assert one editor press/release pair.
- **[Risk] A frame composed while the button is held could expose stale selection from an earlier gesture.** → Clear existing frame selection at the new press as today, while creating no new selection until promotion.
- **[Risk] Prompt drag behavior could diverge from transcript drag behavior at the first moved cell.** → Extend immediately after seeding and retain the existing frame-selection endpoint and auto-scroll paths thereafter.

## Migration Plan

1. Adjust ordinary-editor press, motion, release, and reset handling in the viewport controller to use deferred frame-selection admission.
2. Add intermediate-frame, settled multi-click, drag-promotion, and unaffected transcript-selection regressions.
3. Roll back by restoring immediate frame-selection admission on editor press; no persisted data or settings migration is required.

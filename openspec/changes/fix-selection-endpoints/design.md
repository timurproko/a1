## Context

See `proposal.md` for the reported behavior and scope. The existing shared model in `src/ui/components/text-selection.ts` already records the pointer cell, grapheme-aligned boundaries, anchor/head, and whether distinct motion has occurred. Ordinary drags currently exclude the moving cell by selecting its near boundary, and normalization returns no range when anchor and head coincide even after a drag. Word selection has separate inclusive-cell handling; full-row selection has its own branch.

The transcript viewport and owned fullscreen fallback use shared selection normalization for highlighting and copy extraction. Existing tests deliberately expect an adjacent-cell drag to select only the pressed character. The accepted viewport specification also states that contract, so both the specification and its assertions must be changed deliberately, not treated as an unexplained off-by-one patch.

## Goals / Non-Goals

**Goals:**
- Centralize the corrected gesture interpretation in the shared model while preserving its half-open range interface.
- Keep endpoint normalization constant-time and preserve the existing row-damage and immediate-presentation paths.
- Make empty clicks and nonempty return-to-anchor drags distinguishable without inventing sub-cell coordinates unavailable in terminal cell reports.

**Non-Goals:**
- No input protocol, scheduling, renderer architecture, or dependency changes.
- No changes to editable prompt keyboard selection or terminal-owned selection.
- No new click-to-select-single-character behavior: an unextended ordinary click stays empty.

## Decisions

### Normalize accepted ordinary drags using inclusive grapheme endpoints

Order anchor and head in document order, use the earlier endpoint's before-grapheme boundary as the range start, and the later endpoint's after-grapheme boundary as the exclusive end. Equal endpoints after accepted motion yield the anchor's full grapheme range. Keep ordered ranges half-open so paint and extraction interfaces do not change. Use grapheme-aligned bounds, not a naive one-column increment, to handle wide characters and combined sequences.

Alternative: independently add one column in painting or copying. Rejected because it can split graphemes, disagree between paint and clipboard, and behave differently in reverse selection.

### Preserve the existing drag-activation distinction

Keep the distinct-motion flag latched for the duration of a point gesture. Do not normalize an ordinary unextended press, but do normalize a dragged gesture even when its endpoint equals its anchor. Repeated reports at the original cell do not activate a fresh click; repeated reports after return do not clear a drag. Release preserves a valid one-grapheme range.

For `abcde`, pressing `c` is initially empty; motion to `b` produces `bc`, back to `c` produces `c`, and onward to `d` produces `cd`. A one-character selection is obtained by moving away and back before release. This is a deliberate replacement of the previous smallest-adjacent-drag behavior.

Alternative: select the pressed character on mouse-down. Rejected because it changes ordinary-click ownership and copy behavior. Alternative: retain near-edge boundaries with direction-dependent hysteresis. Rejected because it obscures which pointer cells are selected and leaves multiline endpoint omission unresolved.

### Keep semantic modes and downstream filtering intact

Preserve full-row and word-selection handling rather than allowing point-drag activation rules to shrink their semantic ranges. Audit every shared helper consumer, especially transcript viewport and owned fullscreen fallback selection. Their highlight and copy operations must continue consuming the same ordered range. Existing source-content bounds continue excluding padding, rail glyphs, pinned copies, controls, and dock rows; inclusive pointer endpoints do not make those cells copyable.

Alternative: fix only transcript painting. Rejected because fullscreen fallback and clipboard results would retain the defect.

### Verify state, painted cells, and copied bytes together

Update the old adjacent-cell expectations and add explicit sequence assertions through the anchor, including repeated anchor reports and release. Cover both directions of identical endpoint pairs, same-row and multiline ranges, first/last block characters, wide/combining/emoji endpoints, and ANSI text. Add viewport and shell/terminal-paint evidence that verifies the actual endpoint cell backgrounds and exact clipboard text, not only range metadata. Existing responsiveness, stale-frame suppression, source filtering, semantic clicks, and copy-clear behavior remain regression constraints.

Physical acceptance uses the exact implementation candidate in Windows Terminal/Git Bash, matching the user's environment and screenshot gestures. Record the candidate revision, terminal geometry, gesture sequence, and observed highlight/copy results. Automated success alone does not imply user acceptance.

## Risks / Trade-offs

- [Adjacent-cell gestures now select two distinct graphemes] -> Specify the change explicitly and test single-character selection via return to anchor; do not retain contradictory old assertions.
- [Terminal reports have no sub-cell motion] -> Keep ordinary clicks empty and require a distinct reported cell movement to activate a drag; do not claim mouse movement within a narrow character can be detected.
- [Shared consumers may assume an empty range on return] -> Audit viewport and fullscreen fallback release, copy ownership, and painting with integration evidence.
- [Inclusive endpoints accidentally include chrome or split Unicode] -> Preserve source bounds and grapheme snapping, and assert both painted cells and copied bytes at content edges.
- [Unrelated selection latency regressions get hidden by a boundary fix] -> Retain existing presentation and row-reuse coverage without changing scheduling.

## Migration Plan

1. Integrate this spec-only change before beginning a separate implementation stream based on the accepted change.
2. Implement shared normalization and update affected expectations plus new regression evidence. No stored-state migration or feature flag is required.
3. Pass required CI, then hand off the built candidate through the color-preserving `./scripts/dev` entry for physical-terminal validation. Keep the code PR open until explicit user acceptance and merge authorization.
4. Record acceptance and archive/synchronize this change in a separate spec-only follow-up after code integration.

Rollback is a revert of the implementation commit; if the gesture contract is intentionally withdrawn, reconcile the specification in a separate planning change rather than silently restoring incompatible behavior.

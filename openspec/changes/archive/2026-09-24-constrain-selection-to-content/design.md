## Context

See `proposal.md` for motivation. Bare A1 stores frame-selection endpoints in visible-row coordinates plus semantic row anchors. Document anchors project back into the frame as `documentRow - scrollTop`; dock anchors instead stay pinned by their distance from the bottom.

During edge-held upward scrolling, the lower document anchor can project below the transcript viewport. Today that unbounded line number overlaps the dock's frame-row indices. Selection normalization then operates over the combined transcript-plus-dock row array, so ordinary multiline completion rules paint the editor, footer, and their full-width padding even though both semantic endpoints still belong to the transcript document.

The reference implementation in `D:/Git/claude-code-source` separates the scroll box from fixed shell surfaces. Its drag-scroll path obtains the scroll viewport bounds, captures rows leaving that viewport, shifts the content anchor only within those bounds, and leaves the pointer focus at the edge. Its scroll-translation guards deliberately do not translate mixed scrollbox/static selections, so users can still cross into footer content explicitly. A1 does not need to copy that screen-buffer accumulator design: it already retains semantic document anchors. It needs the same region invariant at projection and painting time.

## Goals / Non-Goals

**Goals:**
- Keep document-only scrolling selections visually and textually bounded to visible transcript rows.
- Preserve explicit transcript-to-dock and dock-to-transcript complete-frame selection.
- Handle forward/reverse selection and both scrolling directions without endpoint teleportation or stale dock paint.
- Preserve bounded visible-row selection composition and existing semantic anchors.

**Non-Goals:**
- Replacing A1's document-anchor model with Claude Code's screen-buffer selection accumulator.
- Adding off-screen selection-copy retention or changing the accepted visible-frame copy payload.
- Preventing users from deliberately selecting prompt, widget, notice, or footer text.
- Changing scrollbar gutters, edge-scroll cadence/speed, source wrapping, editor-local selection, controls, modal routing, or `a1 pi`.

## Decisions

### 1. Derive the visual selection region from semantic endpoint anchors

Selection composition will distinguish a document-only range from a mixed or dock range using the existing `SelectionAnchors`. When both endpoints remain document anchors, its visible range will be clipped to the transcript rectangle. An endpoint that projects above or below that rectangle will contribute the corresponding transcript edge rather than a numerically overlapping dock row.

Alternative: clamp every projected endpoint to the transcript. Rejected because an explicit dock endpoint must remain pinned and selectable, and flattening all endpoints would break complete-frame crossing.

### 2. Preserve explicit cross-boundary selection as an ownership transition

Pointer motion already resolves each endpoint through `#selectionAnchorAt`: transcript rows produce document anchors and dock rows produce dock anchors. Once the pointer explicitly enters a dock row, the mixed anchor pair will continue to use the full frame range. Scrolling alone will not manufacture that transition from an off-screen document line.

Alternative: disable all dock participation for transcript-originated drags. Rejected because the accepted complete-frame contract and the requested UX both require users to be able to continue selecting below the content area deliberately.

### 3. Share one bounded range between paint and visible-frame copy

Painting, `selectedText`, copyability checks, and immutable frame-copy capture will consume the same region-aware visible selection. This prevents a content-only highlight from disagreeing with copied visible text and ensures dock rows are neither painted nor copied merely because a document anchor moved off screen. Existing mixed-range copy remains unchanged.

Alternative: mask dock paint only. Rejected because the UI would claim a narrower selection than the visible-frame copy payload.

### 4. Keep anchor persistence and damage accounting unchanged

Semantic document/dock anchors remain the source of truth across scroll, reflow, and dock updates. Region clipping is a visible-frame projection, not a mutation of document identity. Selection cache keys and damaged-row evidence will naturally represent the clipped per-row ranges; focused tests will assert dock rows are invalidated when accidental paint disappears and are reused afterward.

Alternative: rewrite an off-screen document anchor into a screen-edge anchor during every scroll tick. Rejected because that loses source identity, complicates reversal, and can turn a temporary clipping decision into a persistent endpoint change.

## Risks / Trade-offs

- [Clipping could suppress an intentional dock selection] -> Select the region from semantic endpoint kinds, not pointer position or line number; mixed document/dock anchors retain complete-frame behavior.
- [Paint and copy could diverge] -> Route selection paint, selected text, copyability, and snapshot capture through one region-aware visible-range helper.
- [Reverse drags could choose the wrong edge] -> Cover both anchor orders and both scroll directions with source identities above and below the viewport.
- [Dock geometry changes could leave stale selection] -> Exercise added/removed dock rows and assert selection-damage rows clear obsolete backgrounds.
- [Concurrent scrollbar work changes adjacent composition] -> Keep the rule independent of content width/gutter projection and reconcile the current target before implementation finalization.

## Migration Plan

No data or settings migration is required. Implement the bounded projection in the existing transcript viewport selection path and retain all stored interaction state. Rollback restores the current combined-frame projection behavior without changing persisted sessions or configuration.

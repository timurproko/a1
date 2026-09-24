## Context

See `proposal.md` for motivation. Bare A1 stores frame-selection endpoints in visible-row coordinates plus semantic row anchors. Document anchors project back into the frame as `documentRow - scrollTop`; dock anchors instead stay pinned by their distance from the bottom.

During edge-held scrolling, a document anchor can project beyond the transcript viewport. Direct pointer motion can also replace the moving endpoint with a dock anchor. Selection normalization then operates over the combined transcript-plus-dock row array, so ordinary multiline completion rules paint the editor, footer, and their full-width padding even though the gesture began in transcript content.

The reference implementation in `D:/Git/claude-code-source` separates the scroll box from fixed shell surfaces. Its drag-scroll path obtains the scroll viewport bounds, captures rows leaving that viewport, shifts the content anchor only within those bounds, and leaves the pointer focus at the edge. A1 does not need to copy that screen-buffer accumulator design: it already retains semantic row anchors. It needs the same gesture-origin region invariant at projection and painting time.

## Goals / Non-Goals

**Goals:**
- Keep every transcript-originated selection visually and textually bounded to visible scrolling source rows for its full gesture.
- Exclude a pinned prompt row as chrome while preserving selection of the same prompt at its normal document position.
- Let selection shrink and disappear as its source rows leave the viewport instead of transferring it to sticky, status, or dock rows.
- Preserve editor-originated selection without allowing a content gesture to flood pinned rows.
- Handle forward/reverse selection, direct boundary crossing, and both scrolling directions without endpoint teleportation or stale dock paint.
- Preserve bounded visible-row selection composition and existing semantic anchors.

**Non-Goals:**
- Replacing A1's document-anchor model with Claude Code's screen-buffer selection accumulator.
- Adding off-screen selection-copy retention or changing the accepted visible-frame copy payload.
- Removing editor-originated or other dock-originated selection.
- Changing scrollbar gutters, the declared 30-millisecond edge-scroll cadence or per-speed distance, source wrapping, editor-local selection, control hit targets, modal routing, or `a1 pi`.

## Decisions

### 1. Derive the visual selection region from the gesture origin

Selection composition will distinguish a transcript-originated range from a dock-originated range using the retained anchor endpoint. When the fixed anchor is a document anchor, its visible range will be clipped to the transcript rectangle for the complete gesture, even if the moving endpoint enters a dock row. An endpoint above or below that rectangle will contribute the corresponding transcript edge rather than a pinned row.

Alternative: derive ownership from both current endpoint kinds. Rejected because pointer motion into the dock would immediately discard transcript ownership and reproduce the reported fixed-surface flood.

### 2. Preserve dock-originated selection independently

Pointer presses already resolve through `#selectionAnchorAt`, so a gesture that starts on a dock row retains a dock anchor as its fixed endpoint. The transcript-origin rule will not disable editor-local handling or reclassify a dock-originated gesture as transcript-owned.

Alternative: disable every mixed document/dock range. Rejected because the requested correction is specifically for content-originated expansion, while editor-originated interaction remains outside the change.

### 3. Share one bounded range between paint and visible-frame copy

Painting, `selectedText`, copyability checks, and immutable frame-copy capture will consume the same region-aware visible selection. This prevents a content-originated highlight from disagreeing with copied visible text and ensures dock rows are neither painted nor copied when its moving endpoint crosses the boundary. Dock-originated copy remains unchanged.

Alternative: mask dock paint only. Rejected because the UI would claim a narrower selection than the visible-frame copy payload.

### 4. Keep pinned prompt presentation outside selection projection

A sticky prompt may visually replace the viewport's first source row, but it will not replace that row's semantic selection anchor. The pinned row is excluded from paint, pointer selection, and visible-frame copy; when scrolling reveals the prompt at its ordinary document row, that source row remains selectable normally. Selection endpoints continue projecting from their retained source rows, so ranges naturally shrink and disappear as those rows leave the viewport.

Alternative: pin a selected prompt endpoint to the sticky row. Rejected because this transfers selection from scrolling content into chrome and makes the range appear attached to the status area.

### 5. Keep anchor persistence and damage accounting unchanged

Semantic document/dock anchors remain the source of truth across scroll, reflow, and dock updates. Region clipping is a visible-frame projection, not a mutation of document identity. Selection cache keys and damaged-row evidence will naturally represent the clipped per-row ranges; focused tests will assert dock rows are invalidated when accidental paint disappears and are reused afterward.

Alternative: rewrite an off-screen document anchor into a screen-edge anchor during every scroll tick. Rejected because that loses source identity, complicates reversal, and can turn a temporary clipping decision into a persistent endpoint change.

### 6. Float the scroll-to-bottom control above selection

The control keeps its hit target and base-frame placement. Its label cells are blanked in the selection source rows, as covered overlay cells already are, and the label is repainted over a selected row after selection paint. The row's damage state already includes the control's presentation, so no new cache key is needed.

Alternative: split each selection range around the control. Rejected because every painter would need a multi-span contract for one floating label.

### 7. Pace edge auto-scroll by the declared row distance

The accepted edge-hold scenario declares one, two, or three rows every 30 milliseconds, but the implementation reused the wheel distance of three, six, or nine rows. That tripled the jumps and made held selection feel coarse. Downward auto-scroll also began while the pointer rested on the final content row, which made that row hard to select. Auto-scroll now begins below the final content row, unless no row exists below it, and on the first row, where nothing lies above.

Alternative: add distance-based acceleration. Deferred because it would change the accepted cadence contract rather than restore it.

## Risks / Trade-offs

- [Clipping could suppress editor-originated selection] -> Select region ownership from the fixed gesture anchor; only a document origin enforces the transcript rectangle.
- [Paint and copy could diverge] -> Route selection paint, selected text, copyability, and snapshot capture through one region-aware visible-range helper.
- [Reverse drags could choose the wrong edge] -> Cover both anchor orders and both scroll directions with source identities above and below the viewport.
- [Sticky exclusion could hide the prompt everywhere] -> Assert the pinned alias is skipped while the same source remains selectable at its ordinary document position.
- [Selection could remain attached to viewport edges] -> Scroll both retained source endpoints beyond the frame and assert paint/copy disappear rather than move to chrome.
- [Dock geometry changes could leave stale selection] -> Exercise added/removed dock rows and assert selection-damage rows clear obsolete backgrounds.
- [Concurrent scrollbar work changes adjacent composition] -> Keep the rule independent of content width/gutter projection and reconcile the current target before implementation finalization.

## Migration Plan

No data or settings migration is required. Implement the bounded projection in the existing transcript viewport selection path and retain all stored interaction state. Rollback restores the current combined-frame projection behavior without changing persisted sessions or configuration.

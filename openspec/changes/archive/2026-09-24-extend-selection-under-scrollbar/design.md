## Context

See `proposal.md` for motivation. In `auto` and `always` modes, scrollable rows reserve the final terminal column as a dedicated gutter: source rows, semantic selection, and copy are measured at `contentWidth`, while base composition pads to full frame width and overlays rail chrome afterward. The current selection painter therefore stops at `contentWidth`, leaving the gutter's continued source background visible even for whole and interior selected rows.

The complete-frame selection contract already expects interior selection paint to reach the final terminal column with foreground controls above it. The custom viewport contract must preserve the gutter's source/copy boundary while making that visual projection consistent.

## Goals / Non-Goals

**Goals:**
- Project a right-edge transcript selection's background through the one-cell gutter without changing the semantic selection range.
- Keep track and thumb foregrounds visible over selected and unselected gutter backgrounds across first, cached, and transition frames.
- Preserve bounded row recomposition and truthful selection-damage reporting.

**Non-Goals:**
- Making the gutter a selectable or copyable character.
- Restoring full-width source layout, placing source glyphs beneath the rail, or changing wrapping.
- Changing scrollbar hit testing, drag ownership, geometry, appearance timing, or glyphs.
- Changing dock-row selection, modal coverage, hidden-mode full-width layout, or `a1 pi`.

## Decisions

### 1. Separate the semantic range from its viewport paint projection

Selection membership, endpoint normalization, selected text, and copy snapshots will continue to use the existing `contentWidth`-bounded range. During row composition only, a scrollable-row range whose right boundary equals `contentWidth` will project its paint boundary to the full frame width. Ranges ending before the content boundary will keep their current paint extent.

Alternative: increase the selectable width to the terminal width. Rejected because that would turn the gutter into an endpoint/copy cell, conflict with scrollbar press ownership, and risk reintroducing copied padding or glyphs.

### 2. Paint the projected selection before rail chrome

The projected background will be applied to the already padded full-width base row. Existing rail composition will remain later in the pipeline so its track/thumb foreground replaces only the gutter glyph while inheriting the selected background. An idle automatic rail will expose the same selected blank gutter cell.

Alternative: recolor the rail cell after overlay. Rejected because it duplicates selection styling, risks clearing rail foreground attributes, and creates different selected-cell behavior for visible and hidden rails.

### 3. Keep projection conditional on the existing reserved gutter

Projection applies only to scrollable viewport rows whose content width is narrower than frame width. Hidden scrollbar mode and full-width dock rows retain their existing width and selection path, avoiding an artificial extra column or mode-specific endpoint changes.

Alternative: apply a universal one-cell extension to every selected row. Rejected because dock rows already select through the terminal edge and hidden mode has no gutter.

### 4. Include projected paint extent in row reuse evidence

Selection cache/state keys and damage comparison will represent the effective painted range, while semantic copy continues to use the original range. Focused tests will decode final content and gutter cells across whole/interior and partial endpoints, forward/reverse selection, source backgrounds and links, thin/thick rails, automatic reveal/hover/expiry, and repeated unchanged frames.

Alternative: retain only the semantic range in paint caches. Rejected because future gutter-width or projection changes could reuse a row whose visible final cell no longer matches the desired paint.

## Risks / Trade-offs

- [Visual selection could accidentally become copied padding] → Keep projection local to painting and assert selected text/copy snapshots never include the gutter or rail glyph.
- [Rail resets could clear the newly selected background] → Decode the final gutter cell with hidden, track, thumb, and hover presentations and assert stable background color.
- [Partial right-edge selections could overpaint the gutter] → Extend only when the normalized semantic range reaches `contentWidth`, with explicit excluded-final-grapheme coverage.
- [Cached rows could retain ordinary gutter background] → Key reuse by effective paint extent and exercise first-frame plus repeated rail transitions.

## Implementation Evidence

- Viewport composition now projects only a boundary-reaching semantic selection through the reserved gutter during paint; selection endpoints, selected text, copy snapshots, wrapping, and scrollbar hit ownership remain unchanged.
- Decoded terminal-cell and shell coverage verifies selected and deliberately excluded gutter backgrounds across forward/reverse ranges, source backgrounds, links, wide and combining graphemes, thin/thick rails, `auto` transitions, `always`, `hidden`, repeated frames, and 192x54 multiline selection.
- Focused viewport, frame-selection, shell, and controller coverage passes: 190 tests across four suites. Build, source/bin typechecking, changed-code documentation governance, strict OpenSpec validation, and `git diff --check` pass.
- No implementation gaps are known. Physical Windows Terminal review of the exact candidate remains the user-controlled acceptance activity.

## Migration Plan

No data or settings migration is required. Implement the paint-only projection in the existing viewport row-composition path and retain all geometry and input routing. Rollback restores the ordinary row background in selected gutter cells without changing persisted state or selection/copy data.

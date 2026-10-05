## Context

The custom transcript viewport reserves the final terminal column for scrollbar chrome. Base composition pads each viewport row into that gutter using the row's detected background, then selection and rail paint are applied while source text and copy semantics remain bounded to the content width.

The detached scroll-to-bottom control is currently overlaid into `frameRows` before base-row padding. Its centered label carries an explicit normal or hover background. The gutter helper searches the composed string for an explicit background and therefore treats the control's first inline background escape as though it were the full-row transcript surface. On a row whose actual surface is the terminal default, this produces the reported isolated colored blank cell at the far right.

## Goals / Non-Goals

**Goals:**
- Keep the control background confined to the control label.
- Preserve the actual row or selection surface beneath the final-column gutter.
- Keep visible scrollbar track/thumb paint over that correct surface.
- Lock the behavior with decoded terminal-cell and integrated shell regressions.

**Non-Goals:**
- Changing control text, placement, hover rules, hit geometry, or activation.
- Changing scrollbar width, glyphs, appearance timing, drag behavior, or settings.
- Changing selection membership, copied text, transcript wrapping, dock layout, or the pinned comparison route.

## Decisions

### 1. Treat the bottom control as final floating chrome, not row-surface input

The viewport will retain the control's geometry and selection masking during composition, but apply its visible style after the base row, selection, and scrollbar-gutter surface have been derived. This prevents an inline control background from participating in row-background detection while keeping the control visually above transcript selection.

Alternative: teach the generic background scanner to ignore this control's exact color. Rejected because color values are theme-dependent and another inline overlay could reproduce the same class of leak.

Alternative: clear the gutter after control composition. Rejected because a forced neutral cell would regress background continuity for colored transcript blocks and selected rows.

### 2. Preserve established paint ordering at independent cell ranges

The source row continues to establish ordinary gutter background; boundary-reaching selection may continue its visual background through the non-semantic gutter; the rail glyph remains painted in the final column; and the centered control remains painted only inside `contentWidth`. The control and gutter do not overlap, so their independent surfaces can be composed without changing hit ownership or source semantics.

Alternative: extend the control background across the complete row. Rejected because the control is intentionally a compact floating block and the reported cell is outside its hit region.

### 3. Verify terminal cells rather than ANSI substrings alone

Focused tests will decode the control row and assert that cells inside the label use normal/hover control backgrounds while the final gutter cell uses the underlying ordinary or selection background. Coverage will include idle and visible rails and a repeated frame to catch cache reuse. Existing assertions will retain exact label, row, hit region, selection exclusion, and disappearance after following resumes.

## Risks / Trade-offs

- [Moving visual overlay timing could place selection above the control] → Keep control paint as the final content-area overlay and assert selected control rows still show one uninterrupted control span.
- [The scrollbar glyph could be overwritten or inherit the control background] → Keep the control bounded to `contentWidth` and decode the final-column track/thumb cell separately.
- [Cached rows could preserve the leaked cell after hover or rail transitions] → Exercise normal, hovered, rail-visible, rail-idle, and repeated unchanged frames.
- [A fix could alter semantic selection or copy output] → Retain focused selection masking and copied-text assertions for a control-bearing row.

## Implementation Evidence

- A decoded-cell regression reproduced the original defect before the implementation: both idle `auto` and visible `always` gutter cells incorrectly retained the control background.
- Bottom-control paint now occurs only after ordinary and selected row surfaces plus scrollbar gutter chrome are resolved; its normal and pointed-at backgrounds remain confined to the label.
- The decoded terminal matrix passes for normal/pointed-at controls, idle/visible rails, boundary-reaching selection, and repeated cache reuse. Existing content, gutter, wide-grapheme, link, and rail-transition coverage remains green.
- Focused viewport and session-shell validation passes 209 tests across six suites, including selection, bottom hover, links, compaction, and decoded terminal paint.
- Build, source/bin typechecking, changed-file code-documentation governance, strict OpenSpec validation, and `git diff --check` pass against current `origin/develop` at `90863d18`.
- Exact-head CI run `37313086604` exposed only the expected startup source-byte baseline drift from the viewport implementation. The baseline is re-pinned from 1,544,809 to the measured 1,545,111 bytes with unchanged file reachability, and the complete architecture gate passes.
- No implementation gaps are known. Physical Windows Terminal review of the exact candidate remains the maintainer-controlled acceptance activity.

## Migration Plan

No data or settings migration is required. The implementation changes only paint composition order. Rollback restores the previous ordering without affecting persisted state.

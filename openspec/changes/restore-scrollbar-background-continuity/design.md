## Context

See `proposal.md` for motivation. The scrollbar correctness change now renders scrollable transcript and transient rows at `terminalWidth - 1`, appends a final-column gutter after an ANSI/OSC reset, and overlays a rail glyph in that gutter. The reserved width prevents the rail from replacing text or wide graphemes and gives selection/copy a truthful semantic boundary, but the complete reset also discards the row surface background and creates the visible stripe shown in the reported terminal frame.

The gutter must therefore carry one visual property from its row while remaining presentation-only. Scrollbar visibility can change independently of document rendering, and row caches must not retain a neutral or incorrectly styled final cell across hover, activity, and expiry transitions.

## Goals / Non-Goals

**Goals:**
- Extend the effective full-row content background by one cell into the reserved gutter.
- Keep source glyphs, foreground styling, emphasis, hyperlinks, and semantic selection out of that cell.
- Preserve stable background paint across idle, track, thumb, hover, cached, and appearance-transition frames.

**Non-Goals:**
- Returning to full-terminal-width transcript layout or placing source text beneath the rail.
- Changing selection membership, copy output, rail colors/glyphs, hover timing, geometry, or gestures.
- Changing dock, modal, settings-list, or `a1 pi` rendering.

## Decisions

### 1. Preserve the dedicated semantic gutter and change only its background composition

Transcript, steering, and working-status rows will continue to render at the existing content width in `auto` and `always`; `hidden` will continue to return the column to content. Gutter composition will derive the row's effective background surface and paint one blank cell with that background before any rail glyph is overlaid.

Alternative: restore full-width source rows and the former overlay. Rejected because the rail could again replace a final glyph, split a wide grapheme, carry a hyperlink, and make semantic selection depend on rail visibility—the defects the prior fix removed.

### 2. Carry background state explicitly rather than inheriting the boundary cell's complete style

The gutter will retain only the row's explicit full-row background role. OSC 8 links, foreground color, reverse video, bold, italic, underline, and other source decoration will be terminated before the blank gutter cell. Selection remains a later semantic paint bounded by `contentWidth`, so selecting the final source cell does not convert the gutter into a selected or copyable cell.

Alternative: let the overlay inherit all active ANSI/OSC state from the adjacent source cell. Rejected because boundary-local emphasis or hyperlinks could leak into scrollbar chrome and because the final source glyph's local style is not necessarily the row's background surface.

### 3. Overlay rail foreground without clearing the prepared gutter background

Visible thin/thick track and thumb glyphs will be drawn after base-row and selection composition, preserving the gutter's prepared background while applying the existing rail foreground/decorative reset. An idle `auto` rail will leave the same background-painted blank cell. Cache keys and transition coverage will continue to distinguish row content, content width, selection, and rail state.

Alternative: compose a fully reset rail glyph and then attempt to restore background afterward. Rejected because terminal background restoration around an already overlaid cell is more prone to stale first-frame and cached-frame differences.

### 4. Validate decoded cells as well as semantic output

Focused tests will decode the final content and gutter cells for default and colored block rows, linked/emphasized boundary content, selected and unselected endpoints, thin/thick rails, idle/revealed/hovered states, and repeated cached frames. Separate assertions will retain wrapping, copied text, and gutter hit ownership so visual restoration cannot regress the correctness fix.

## Risks / Trade-offs

- [ANSI rows can contain several local background transitions] → Reuse the viewport's established full-row background-padding semantics rather than copying the last glyph's complete style, and cover representative block rows in decoded-cell tests.
- [Rail style reset can accidentally clear the continued background] → Decode track and thumb cells and assert their background matches the row surface in every visibility state.
- [Selection paint can leak into the gutter while extending full rows] → Keep range geometry clamped to `contentWidth` and verify adjacent selected cells leave the gutter non-semantic and source-background-colored.
- [Cached frames can preserve the old neutral gutter] → Exercise first render, reveal, hover, expiry, and repeated unchanged composition with terminal replay evidence.

## Implementation Evidence

- Gutter composition now closes source links, foreground, reverse video, and emphasis before repainting the established full-row background; visible rail glyphs inherit only that prepared background.
- Decoded terminal-cell coverage passes across default and colored rows, selected and excluded endpoints, links, wide and combining graphemes, thin/thick styles, `auto` idle/reveal/hover/expiry cycles, `always`, `hidden`, and repeated cache reuse.
- Focused component, controller, and session-shell coverage passes: 240 tests across six suites. The five broader suites were run serially to avoid timer-test contention; 229 tests passed, and the dedicated gutter suite passed all 11 tests.
- Build, source and bin typechecking, changed-file code-documentation governance, strict OpenSpec validation, and `git diff --check` pass against current `origin/develop` at `93f6928f`.
- No implementation gaps are known. Physical Windows Terminal review of the exact candidate remains the user-controlled acceptance activity.

## Migration Plan

No data or settings migration is required. Implement the visual composition change in the existing viewport path and retain the current content-width and input geometry. Rollback restores neutral gutter paint without changing persisted state or scrollbar behavior.

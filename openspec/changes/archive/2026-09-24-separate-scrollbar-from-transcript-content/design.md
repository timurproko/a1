## Context

See `proposal.md` for motivation. Bare A1 currently renders scrollable transcript rows at the complete terminal width, then `TranscriptViewport` paints the scrollbar over the final cell. The viewport separately reports `contentWidth = width - 1` for `auto` and `always`, but row padding deliberately carries a source or selection background into the overlaid cell. That behavior preserves source text beneath the rail, yet it also makes the rail bisect full-width backgrounds and lets the right edge change appearance as the rail reveals, hovers, and hides.

The dock is not part of the scrollable transcript and must continue to use the full terminal width. `hidden` appearance intentionally returns the reserved cell to content. Selection and copy operate from semantic source rows and must remain independent of rail glyphs.

## Goals / Non-Goals

**Goals:**
- Give `auto` and `always` one stable, dedicated final-column gutter for scrollable transcript and transient rows.
- End transcript wrapping, source backgrounds, hyperlinks, and selection paint at the content boundary immediately before that gutter.
- Keep rail presentation and row-cache transitions correct without changing scrollbar geometry or interaction ownership.

**Non-Goals:**
- Changing rail glyphs, colors, thumb sizing, track inset, hover/activity timing, wheel rates, drag, or paging behavior.
- Adding a new setting or changing how `hidden` intentionally restores the full width.
- Changing dock width, modal geometry, terminal-native selection, or the pinned `a1 pi` route.

## Decisions

### 1. Render scrollable content at the viewport's declared content width

For `auto` and `always`, render semantic transcript blocks and transient steering/status rows at `max(1, terminalWidth - 1)`. Keep `hidden` at the complete terminal width. This makes wrapping and block backgrounds terminate before the rail rather than relying on a final-cell overlay to conceal source content.

Alternative: keep full-width source rows and only force a neutral background under the glyph. Rejected because text, links, or wide graphemes would still be hidden by the rail and block edges would still change when the rail disappears.

### 2. Compose a neutral gutter separately from transcript row padding

Pad or truncate the scrollable content only through `contentWidth`, explicitly close hyperlinks and source decoration at that boundary, then append one neutral gutter cell. Draw a visible track/thumb into that cell with the existing foreground theme. When an automatic rail is idle, leave the same cell blank and neutral; do not let source, block, or selection background leak into it. Continue composing dock rows at full width.

Alternative: reserve an additional blank gap plus a rail column. Rejected because one existing reserved cell is sufficient and a two-column reduction would add unnecessary wrapping.

### 3. Make the semantic selection boundary equal the rendered content boundary

Clamp transcript pointer selection to `contentWidth` when a gutter is reserved and to full width in `hidden` mode. Full-row and multiline selection paint reaches the final source cell but never colors or copies the gutter. Rail-origin gestures keep scrollbar ownership, while a selection reaching the last content cell remains an ordinary transcript selection.

Alternative: retain terminal-width selection and strip the gutter after painting. Rejected because it preserves a non-semantic selectable cell and makes visual range bookkeeping harder to prove truthful.

### 4. Validate source geometry and decoded terminal cells independently

Focused tests will verify render widths and wrapping at the shell boundary, semantic copy at the last content grapheme, and decoded final two terminal cells across rail visibility states. Fixtures will include source backgrounds, links, selection, wide/combining graphemes, thin/thick styles, and narrow plus representative wide geometry. Cache assertions will cover first-transition and repeated frames so an idle rail cannot leave stale source or gutter styling.

## Risks / Trade-offs

- [Reserving the gutter changes wrapping by one column in `auto` and `always`] → Treat this as the intended contract change and test block layout, timestamps, transient rows, and resize behavior at boundary widths.
- [ANSI source background or OSC 8 state leaks into the gutter] → Close boundary state explicitly and inspect decoded cell background, decoration, and hyperlink targets rather than relying on string matching.
- [Changing appearance to or from `hidden` leaves rows rendered for the old width] → Keep appearance changes as layout invalidations and verify immediate reflow in both directions.
- [Dock rows are accidentally narrowed with transcript rows] → Keep gutter composition scoped to viewport-owned scrollable rows and assert editor/footer width and placement remain unchanged.

## Implementation Evidence

- Reconciled implementation with `origin/develop` at `70b9ebd2` before final validation.
- Focused component, controller, shell, link, selection, compaction, and terminal-cell coverage passed: 279 tests across eight suites, run serially so timer-based selection evidence was not distorted by concurrent suite load.
- `npm run build`, `npm run typecheck`, changed-file code-documentation governance, strict OpenSpec validation, and `git diff --check` passed.
- No implementation gaps are known. User-controlled Windows Terminal review of the exact candidate remains an acceptance activity rather than a waived behavior gap.

## Migration Plan

No persisted data or settings migration is required. After approval, implement and validate the behavior in this same branch and draft PR. Rollback is a code revert plus restoration of the prior custom-session viewport requirements before finalization.

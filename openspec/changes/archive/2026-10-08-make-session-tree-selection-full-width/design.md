## Context

See `proposal.md` for motivation and `specs/owned-pi-ui-foundation/spec.md` for the observable contract. Session Tree builds semantic ANSI fragments for each visible entry, applies `selectedBg` separately to the selected gutter and body, then horizontally clips the composed row. Because no selected padding is emitted after the final visible fragment, short entries leave the rest of the available row unpainted. Resume Session instead fits its complete row first and applies a reset-safe selected background across the fitted width.

The tree renderer also owns horizontal panning around the selected entry anchor, left and right clipped-edge ellipses, bracket-delimiter preservation, tree gutters, and item-specific foreground roles. Full-row geometry must be added after those content decisions so it does not alter viewport calculations or semantic content.

## Goals / Non-Goals

**Goals:**

- Paint every available Session Tree row cell from the selected arrow through the right edge with `selectedBg`.
- Keep selection width stable while focus moves between entries of different rendered lengths.
- Preserve semantic foregrounds, no-bold styling, hierarchy, panning, and clipped-edge markers.
- Keep rendering ANSI-aware and bounded at wide and narrow terminal widths.

**Non-Goals:**

- Changing unselected-row geometry or colors.
- Changing tree indentation, folding, filtering, searching, navigation, labels, timestamps, copying, or selection actions.
- Changing the selection palette, theme definitions, modal frame inset, or Resume Session implementation.
- Changing the explicit `a1 pi` comparison profile.

## Decisions

### 1. Fit the selected viewport row before painting its background

The viewport renderer will continue to derive horizontal scroll, clipping, ellipses, and the selected row's visible semantic fragments from intrinsic content widths. After the visible row is assembled and clipped to the available width, only the selected row will be padded to that complete width and painted with `selectedBg`. Unselected rows will retain their existing item-sized output.

Padding or painting the semantic body before viewport calculation was rejected because it would make every selected row appear intrinsically full-width, distort horizontal-scroll bounds, and interfere with clipped-edge detection.

### 2. Reassert selection after nested ANSI style changes

The full-row painter will follow Resume Session's reset-safe composition strategy: apply the selection background as the outer style and reassert it after embedded SGR sequences from entry foregrounds and text styles. This keeps the arrow, labels, descriptions, timestamps, connectors, and ellipses in their existing semantic roles while ensuring resets cannot punch holes in the selected surface.

Replacing semantic fragments with one selected foreground was rejected because selection must not erase domain-specific entry roles. Adding a new theme token was rejected because `selectedBg` already defines the accepted palette.

### 3. Verify cell geometry independently from plain text

Focused tests will inspect ANSI cell backgrounds at the arrow, content, and final available row cell. They will move focus between differently sized entries and exercise narrow horizontal clipping so full-width coverage, stable width, clipped markers, semantic foregrounds, and terminal bounds are all proven together. Unselected rows will remain free of selection background.

Screenshot-only or trimmed-text assertions were rejected because trailing selected cells are whitespace and disappear from ordinary snapshots.

## Risks / Trade-offs

- **[Embedded ANSI resets clear part of the full-row surface]** → Reassert the background after each SGR sequence and verify cells after multiple semantic fragments.
- **[Padding changes horizontal panning or clipping]** → Calculate viewport offsets and clipped markers from intrinsic content before fitting the selected output row.
- **[Narrow widths overflow through markers or wide characters]** → Keep the existing column-aware slicing/truncation path and assert every rendered row remains within the requested width.
- **[Copied-source documentation drifts]** → Update the provenance modification summary and pinned Pi source ledger with the renderer change.

## Migration Plan

No persisted data or configuration migration is required. Deploy the renderer, focused regressions, and provenance refresh together. Rollback restores item-bounded Session Tree selection without affecting sessions or tree state.

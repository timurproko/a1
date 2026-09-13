## Context

See `proposal.md` for motivation and the viewport delta for observable behavior. The screenshots show bare A1 with long tool-output rows, a multiline selection, and an auto rail that changes the apparent right-edge selection on hover.

Inspection of the planning base reveals two independent candidate mechanisms to reproduce before fixing:

1. `TranscriptViewport.compose` pads and selects rows through terminal `width`, but derives `contentWidth` as `width - 1` for auto/always rails. `extendSelection` clamps ordinary endpoints to that narrower width even though ordinary transcript content renders beneath the final-column rail overlay.
2. Selection is painted before `overlaySpan` replaces the final cell. That helper emits ANSI tokens at the overlay start in its replay after the replacement glyph, not before it. A background transition at precisely that boundary can therefore leave the rail glyph using the preceding cell's background. The shell's rail reset intentionally preserves background, so a partial selection can look extended on hover.

These are code-inspection hypotheses, not claimed physical-terminal reproduction. Current source endpoint normalization and older accepted selection artifacts are not entirely aligned; this work does not reconcile or redesign general drag semantics.

## Goals / Non-Goals

**Goals:**
- Separate selection reach from control-layout reservation without changing transcript wrapping.
- Derive rail background from the replaced cell, not neighboring ANSI state.
- Keep semantic range, visual range, and source copy consistent at the right edge while retaining bounded visible-row caches.

**Non-Goals:**
- Changing scrollbar settings, glyphs, hover timing, hit regions, prompt timestamp gutters, or control placement.
- Reworking global pointer endpoint semantics, selection cadence, auto-scroll rates, terminal-owned selection, or the pinned comparison route.
- Changing installed dependencies or introducing a new rendering architecture.

## Decisions

### 1. Give active selection the full rendered source width

Track/use the terminal-width selection extent independently of the narrower width used by controls. Active drags reaching the rail column must resolve against the source grapheme at that column. Keep existing rail-first ownership for a new press in its hit region, and leave prompt metadata/padding exclusions in semantic line-content handling.

Alternative: reserve a blank column for all text. Rejected because it changes wrapping and removes the accepted full-width content behavior. Alternative: paint the final cell selected unconditionally. Rejected because it hides missing copied characters and incorrectly extends partial selections.

### 2. Compose the rail with the actual replaced cell's background

Use the normalized per-row selection range and source cell background state to make the replacement cell truthful. Prefer a narrowly scoped rail composition path (or explicit opt-in span behavior) that honors background transitions at the overlay boundary before drawing the rail, while clearing source hyperlink and emphasis and applying the rail's own foreground. Preserve existing generic overlay behavior unless focused tests prove a shared fix safe.

Do not simply retain the preceding cell's background or reset all backgrounds: the former creates false selection and the latter erases legitimate selection or tool/prompt backgrounds. An unconditional selection-colored rail is likewise invalid. Preserve grapheme-safe overlay behavior and restore the underlying source on hide.

### 3. Validate semantic and painted results independently

Tests must inspect normalized selection/copy and decoded final terminal cells; ANSI string-presence assertions alone cannot prove that a reset took effect before the rail glyph. Use a full-width endpoint row, full/interior rows, and a partial endpoint that stops one character short. Exercise repeated reveal/hover/hide cycles with the selection released so hover cannot be confused with an active drag moving its head.

Add shell/controller pointer evidence for a drag entering the rail and a distinct rail-origin gesture. Use the production rail theme reset, colored tool rows, links, wide and combining graphemes, auto/always/hidden appearances, thin/thick styles, narrow widths, and representative 192-column geometry. Check the first transition frame and cached repeat frames, copy output, source restoration, and no stale selection damage. CI is the required automated gate; physical Windows Terminal review uses the exact built candidate.

## Risks / Trade-offs

- [Changing a shared overlay helper affects unrelated controls] → Prefer a rail-scoped change or explicit option, and retain generic span/control regressions if the helper changes.
- [Widening control content width alters hit regions or prompt gutters] → Separate selection extent instead of globally redefining the existing control width.
- [A selection-colored test theme masks production ANSI behavior] → Decode terminal cells with the real rail reset and source-background fixtures.
- [Wide glyphs straddling the rail are visually occluded] → Retain grapheme-safe overlay replacement, select/copy the complete source grapheme, and verify restoration after hide.
- [Existing selection work lands concurrently] → Rebase implementation on current accepted development and preserve its non-edge endpoint semantics; keep this delta additive and scoped.

## Migration Plan

Merge this specification-only change first. On a subsequent explicit implementation request, create a fresh detached worktree and implementation branch from current `origin/develop`, citing this accepted change. No persisted data or settings migration is needed. Run required CI, hand off the exact candidate with build plus `./scripts/dev`, and record user acceptance before any explicitly authorized code merge. Rollback is a code revert; accepted specification archival follows acceptance and integration.

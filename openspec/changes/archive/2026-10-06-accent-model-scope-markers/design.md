## Context

Bare A1 presents two nearby selection-state conventions. The Models dialog uses `●`/`○` to represent membership in a multi-model cycling scope, while Thinking Level uses `◉`/`○` to represent one configured default. The filled Thinking marker already uses the semantic `accent` role, but the filled Models marker uses `success`, producing the green-versus-purple mismatch shown in the supplied captures.

The Models row also has a separate success-colored `✓` for the active model. Recoloring only the filled scope marker preserves that success meaning and keeps the multi-select and exclusive-select glyphs distinct.

## Goals / Non-Goals

**Goals:**

- Use the semantic accent role for every filled Models scope marker.
- Match the color role of Thinking Level's filled default radio marker.
- Preserve empty-marker, active-model, row-selection, layout, and interaction semantics.

**Non-Goals:**

- Changing `●`, `◉`, `○`, or `✓` glyphs.
- Changing the Models selected-row background or any theme color definition.
- Changing scope membership, persistence, filtering, ordering, active-model selection, or the pinned comparison profile.

## Decisions

### 1. Reuse the existing accent role

The filled Models scope marker will use `theme.fg("accent", "●")`, the same semantic foreground role used by Thinking Level's filled `◉`. The implementation will not copy a literal RGB value, so all supported themes and color modes continue resolving the marker consistently.

Introducing a new theme token was rejected because this is an alignment of two existing selection indicators, not a new semantic state. Changing the Thinking marker to success green was rejected because the supplied single-selection treatment is the desired reference.

### 2. Preserve independent row states

The scope marker color will not depend on whether its row is keyboard-selected. A scoped model remains accent-colored in selected and unselected rows. Empty scope markers remain dim, and the active-model `✓` remains success-colored.

This keeps three independent states readable: row focus, scope membership, and active model.

### 3. Test semantic styles rather than terminal RGB

Focused tests will compare marker cell styles with the theme's semantic `accent`, `dim`, and `success` renderings. Existing interaction tests remain authoritative for scope edits, filtering, saving, and model selection.

## Risks / Trade-offs

- **[The accent marker could be mistaken for row focus]** → Keep the existing `●` multi-select glyph and separate accent arrow; assert scoped markers retain accent on unselected rows.
- **[The active model could lose its distinct status]** → Leave `✓` on the success role and assert both styles when a model is scoped and active.
- **[Literal color assertions could become theme-specific]** → Compare semantic ANSI roles rather than RGB escape sequences.

## Migration Plan

No persisted data or configuration migration is required. Reverting the one semantic marker role restores the previous presentation without affecting saved scope state.

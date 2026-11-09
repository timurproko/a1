## Approved visual outcome

The maintainer approved the terminal preview and explicitly requested implementation. Thin uses `┃` for both track and thumb; thick uses `▐` for both. The track retains the theme's dim role and the thumb retains its accent role. Purple in the preview illustrates the current accent, not a hard-coded product color.

The earlier two-column and full-block alternatives were not the final approved preview. Both selected glyphs occupy one terminal column. The half-block is visually wider than the heavy box-drawing line, but their physical pixel-width ratio is terminal-font-dependent; this change does not promise an exact pixel ratio.

## Implementation

Change the central presentation policy and the list-rail fallback together. Hover and drag continue to reveal an automatic rail without switching a thin thumb to the new thick glyph. No geometry, selection boundary, clipboard content, wrapping, appearance timing, pointer ownership, settings schema, or wheel-distance changes are needed. All A1 surfaces that use the shared policy inherit the same style.

Update existing precise glyph assertions and rail-detection helpers to recognize the new glyph set without weakening shape, color, visibility, selection, width, or pointer assertions. Add direct checks of theme roles and stable glyphs under hover/drag for both styles.

## Validation and known gaps

Run typecheck, strict change validation, and only focused test files covering the shared rail and its consumers before publication. Required ready CI remains authoritative. Manual terminal review is optional and does not block task completion. No known implementation gaps at planning time.

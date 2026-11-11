## Context and authorization

The maintainer selected option A after comparing actual colored terminal glyphs. Option A preserves the existing completed `━` stroke and changes only the remaining track from `─` to `━`. This is not a thicker completed segment or a scrollbar implementation change.

## Decisions

- Change the track glyph directly in both existing renderers. The installer must remain dependency-free; no shared runtime module or new dependency is needed.
- Keep all ANSI color sequences and percentage positioning unchanged. Color distinguishes completed cells from remaining cells even though their glyphs now match.
- Extend existing exact-output tests rather than relying on visual screenshots. Check renderer parity across empty, partial, rounded, and complete percentages and saved accents.

## Scope boundaries

No bar-length, fill calculation, phase, animation, cleanup, palette, installer/update orchestration, or percentage-text changes. Inline comparisons established the requested appearance; optional manual inspection does not require installing or updating a real global package.

## Implementation observations

Pending implementation and focused checks.

## Known gaps

None identified in the approved scope.

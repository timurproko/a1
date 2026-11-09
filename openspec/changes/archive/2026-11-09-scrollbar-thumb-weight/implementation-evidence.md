# Implementation evidence

## Delivered behavior

- Shared scrollbar presentation uses `┃` for the thin track and thumb, and `▐` for the thick track and thumb. Fallback list rails use the same thin appearance.
- The existing dim track and accent thumb theme roles are preserved. Hover and drag retain the selected glyph; no literal preview color entered product code.
- Both glyphs remain one terminal column. Geometry, gutters, minimum/proportional thumb height, scroll speed, visibility/linger, pointer ownership, selection and clipboard semantics, and comparison-profile boundaries are unchanged.
- Focused assertions now identify the settings thumb by its accent role instead of an obsolete hover-only glyph. Terminal cell replay covers both styles, gutter backgrounds, semantic copied content, and style changes without selection drift. Rendering freshness ignores the new gutter glyph without changing budgets.

## Focused local checks

- Worktree-local `npm ci --ignore-scripts --no-audit --no-fund`: passed; no shared dependency links were created.
- `npm run build` and final `npm run typecheck`: passed.
- Twelve explicitly selected Vitest files have passed at their final file revisions, totaling 347 tests. They cover the scrollbar component, selection gutter, transcript viewport, Settings, reference screen, shell content geometry, shell links, shell selection, and rendering budget/policy/smoke/write evidence. Initial runs exposed stale old-glyph assertions; these were updated to the precise approved glyph, including explicit accent checks, and rerun successfully. The rendering stability matrix remained unchanged and passed.
- `openspec validate scrollbar-thumb-weight --strict` and `git diff --check`: passed.
- The same PR's acceptance list is prepared for final readiness; the delivery body check and current-target reconciliation are completed before checking its final Implementation item.

## Known gaps

No known implementation gaps within the approved scope. The approved glyphs match the final preview; their physical pixel-width ratio remains font-dependent, as recorded in the design. Manual interactive assessment of the built app has not been performed and is optional. Local checks do not claim exact-head CI success or maintainer acceptance.

## Context and authorization

The maintainer selected option A after comparing actual colored terminal glyphs. Option A preserves the existing completed `━` stroke and changes only the remaining track from `─` to `━`. This is not a thicker completed segment or a scrollbar implementation change.

## Decisions

- Change the track glyph directly in both existing renderers. The installer must remain dependency-free; no shared runtime module or new dependency is needed.
- Keep all ANSI color sequences and percentage positioning unchanged. Color distinguishes completed cells from remaining cells even though their glyphs now match.
- Extend existing exact-output tests rather than relying on visual screenshots. Check renderer parity across empty, partial, rounded, and complete percentages and saved accents.

## Approved Session Info refinement

The maintainer requested these related UI fixes in the same PR, selected separate Folder/File rows with a trailing folder separator, and requested left-aligned Cached/Uncached labels and one blank row before the footer.

- Split paths by their final source separator rather than normalizing them with the host OS. Windows, POSIX, root, and relative paths retain their original spelling. Keep the filename on its labelled row when it fits; preserve complete content through wrapping at smaller widths.
- Keep all value columns left-aligned, including numeric values. Remove only the cache-token sublabel indentation; preserve cost-breakdown nesting and all values and semantic styles.
- Reserve footer breathing room in dialog chrome, not scrollable report content. Account for that row in viewport height, paging, and rail geometry. Full-screen Changelog/Keyboard Shortcuts presentation stays unchanged.
- Finalized-delivery CI reported `delivery-artifact-missing`: the archived change lacked `.openspec.yaml`. Add the standard spec-driven metadata without changing validation rules, then let normal finalization regenerate digests.

## Scope boundaries

No bar-length, fill calculation, phase, animation, cleanup, palette, installer/update orchestration, report-calculation, or percentage-text changes. Inline comparisons established the requested progress appearance; optional manual inspection does not require installing or updating a real global package. The pinned comparison Session Info remains unchanged.

## Implementation observations

- Both renderers now use `━` for the remaining segment; the completed segment and every ANSI color sequence are unchanged.
- Exact-output tests cover clamped zero/full, partial, and rounded percentages. Installer/update byte parity includes a saved pink accent; existing default and saved-green assertions remain intact.
- Focused validation: `vitest run test/foundation/release/update.test.ts test/foundation/release/installer-bootstrap.test.ts` passed with 109 tests passing and 6 existing platform/conditional skips.
- The fresh worktree initially lacked generated `dist` declarations required by bin typechecking. `npm run build:core` generated them successfully, and the subsequent complete `npm run typecheck` passed.
- Strict OpenSpec validation and `git diff --check` passed. No real global installation or update was performed; the pure built renderer is available for optional terminal inspection.
- Review confirms the product diff is limited to the two track-glyph substitutions, with no change to movement, colors, width, percentage positioning, or cleanup.

## Known gaps

None identified in the approved scope.

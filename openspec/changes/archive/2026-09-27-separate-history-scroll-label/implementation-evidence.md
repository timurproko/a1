# Implementation evidence

## Result

- Recalled-history position remains dim at the four-cell left inset with no dot or joined overflow suffix.
- Hidden lines above use the editor's existing centered `↑ N more` border geometry and active border color, matching the lower cue without changing row count.
- History position remains visible at collision widths; a complete overflow cue shifts right when it fits and is omitted only when the border is too narrow for both complete labels.
- The pinned comparison profile retains its existing centered upper and lower overflow borders.

## Focused validation

- `npx vitest run test/integrations/pi/components/history-editor-core.test.ts test/integrations/pi/components/history-editor-shell.test.ts test/integrations/pi/components/editor-autocomplete-placement.test.ts` — passed, 3 files and 33 tests.
- `npm run build` — passed.
- `npm run typecheck` — passed after the required build generated `dist/` declarations used by the bin project.
- `npx openspec validate separate-history-scroll-label --strict` — passed.
- `node scripts/governance/check-code-documentation.mjs --mode full` — passed.
- After the history-visibility refinement, the same focused Vitest command passed again with 3 files and 33 tests; `npm run build`, `npm run typecheck`, and full code-documentation governance also passed again.
- `npx openspec validate --archived --strict` reported `✓ change/2026-09-27-separate-history-scroll-label`; the aggregate command remains nonzero because 68 unrelated historical archives retain incomplete legacy acceptance tasks.
- The changed history-editor provenance header and SHA-256 were checked directly against its updated source-ledger record — passed (`1d034e175e37456d115ead3b876f008fda215a2f8af799d9089361e62db4f2a5`).

## Validation environment disposition

The full pinned-source ledger command remains unusable in this Windows checkout because it hashes checked-out CRLF bytes: it fails first on untouched `keybindings.ts` in both this worktree and the clean primary checkout. That file's normalized-LF hash exactly matches its committed ledger value. The changed history-editor record was therefore verified directly as listed above; canonical exact-head CI remains responsible for the full LF-checkout ledger gate. No product behavior gap is known.

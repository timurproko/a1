# Implementation evidence

## Result

- Recalled-history position remains dim at the four-cell left inset with no dot or joined overflow suffix.
- Hidden lines above use the editor's existing centered `↑ N more` border geometry and active border color, matching the lower cue without changing row count.
- Collision widths retain the complete width-safe overflow cue and restore the history position after resize.
- The pinned comparison profile retains its existing centered upper and lower overflow borders.

## Focused validation

- `npx vitest run test/integrations/pi/components/history-editor-core.test.ts test/integrations/pi/components/history-editor-shell.test.ts test/integrations/pi/components/editor-autocomplete-placement.test.ts` — passed, 3 files and 33 tests.
- `npm run build` — passed.
- `npm run typecheck` — passed after the required build generated `dist/` declarations used by the bin project.
- `npx openspec validate separate-history-scroll-label --strict` — passed.
- `node scripts/governance/check-code-documentation.mjs --mode full` — passed.
- The changed history-editor provenance header and SHA-256 were checked directly against its updated source-ledger record — passed (`b9ae36c90e162d6019476929f12dc177cdd16716455e3e819eb59e766698295f`).

## Validation environment disposition

The full pinned-source ledger command remains unusable in this Windows checkout because it hashes checked-out CRLF bytes: it fails first on untouched `keybindings.ts` in both this worktree and the clean primary checkout. That file's normalized-LF hash exactly matches its committed ledger value. The changed history-editor record was therefore verified directly as listed above; canonical exact-head CI remains responsible for the full LF-checkout ledger gate. No product behavior gap is known.

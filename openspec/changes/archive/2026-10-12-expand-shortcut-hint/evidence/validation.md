# Validation evidence

Recorded at `2026-10-12T16:41:02Z` for the approved built-in-renderer refinement.

- `npm run build` — passed.
- `npx vitest run test/integrations/pi/components/tool-shell-parity.test.ts` — passed: 1 file, 27 tests.
- `npm run typecheck` — passed for source and bin TypeScript projects.
- `npm run check:architecture` — passed architecture boundaries, session-writer guard, product-identity governance, pinned Pi source-ledger provenance, and terminal-host provenance.
- `openspec validate expand-shortcut-hint --strict` — passed.
- `git diff --check` — passed.

## Manual acceptance

- At `2026-10-12T16:44:47Z`, the user retested PR #762 in the linked worktree and confirmed the corrected built-in collapsed hint works.

## Known gaps

None.

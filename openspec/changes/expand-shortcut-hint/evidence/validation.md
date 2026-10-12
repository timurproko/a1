# Validation evidence

Recorded at `2026-10-12T15:40:56Z`.

- `npx vitest run test/integrations/pi/components/tool-shell-parity.test.ts` — passed: 1 file, 19 tests.
- `npm run build` — passed; generated the repository-local build required by bin typechecking.
- `npm run typecheck` — passed for source and bin TypeScript projects.
- `npm run check:architecture` — passed architecture boundaries, session-writer guard, product-identity governance, pinned Pi source-ledger provenance, and terminal-host provenance.
- `openspec validate expand-shortcut-hint --strict` — passed.
- `git diff --check` — passed.

## Known gaps

None.

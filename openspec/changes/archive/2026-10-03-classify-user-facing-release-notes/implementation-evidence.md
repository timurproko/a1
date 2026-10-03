# Implementation evidence

## Results

- Release-note generation now gives breaking markers precedence, excludes ordinary non-breaking chores and historical generated regression-triage titles, retains historical and current Pi upgrades under `Changed`, and reports `No user-facing changes.` when all entries are filtered.
- New regression-triage proposals use `chore(regression): ...` without changing their trusted `fix/nightly-regression-*` branch or provenance. New Pi proposals use `upgrade(pi): ...` while retaining their `chore/pi-*` branch and bot-authored proposal commit.
- Legacy acceptance-title normalization recognizes `upgrade(...)`, and the release runbook documents filtering, regression retitling, Pi grouping, breaking precedence, and unchanged draft review authority.

## Focused validation

- `npx vitest run test/repository-governance/release-notes.test.ts test/repository-governance/regression-triage-proposal.test.ts test/repository-governance/pi-upstream-sync-workflow.test.ts test/repository-governance/openspec-acceptance-github.test.ts` passed 47 tests across 4 files.
- `npx vitest run test/repository-governance/release-command.test.ts test/repository-governance/ci-release-runbook.test.ts` passed 39 tests across 2 files.
- `node scripts/release/check-release-documentation.mjs` and `npm run check:docs-governance` passed.
- `npx openspec validate classify-user-facing-release-notes --strict` passed before implementation completion and is rerun on the completed artifacts.

## Known gaps

None. The current draft GitHub Release remains intentionally human-editable and is not mutated by this implementation; a later source refresh uses the new deterministic generation policy.

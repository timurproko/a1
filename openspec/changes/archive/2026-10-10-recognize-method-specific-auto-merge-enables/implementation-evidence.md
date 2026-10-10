# Implementation Evidence

## Delivered behavior

- Acceptance provenance treats `auto_merge_enabled`, `auto_squash_enabled`, and `auto_rebase_enabled` timeline events as one native auto-merge enable through a shared predicate.
- Documentation automation now preserves an authorized maintainer's squash or rebase arm on the exact finalized version-3 head, including after an earlier policy-disarmed attempt.
- Merge-time verification records human-enabled auto-merge for method-specific arms and manual integration after #742's sequence of disarmed squash enables.
- Bot and App enables, enables before the final commit, legacy manual-only acceptance with any enable, and other existing refusals are unchanged.

## Validation

- `npx vitest run test/repository-governance/openspec-acceptance-policy.test.ts test/repository-governance/documentation-auto-merge.test.ts test/repository-governance/openspec-single-pr-github.test.ts` — passed: 139 tests across 3 files.
- The same new cases run against the previous `openspec-acceptance-policy.mjs` — failed as expected: 3 policy cases and 2 documentation-workflow cases.
- `npx tsgo -p tsconfig.json --noEmit` — passed.
- `npm run check:docs-governance` — passed.
- `npx openspec validate recognize-method-specific-auto-merge-enables --strict --no-interactive` — passed.
- `git diff --cached --check` — passed.

## Known gaps

None. PR #742's recorded archive verification is outside this change and can be re-run after merge.

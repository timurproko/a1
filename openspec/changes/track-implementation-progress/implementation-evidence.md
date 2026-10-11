# Implementation evidence

Implementation continued in the linked `E:/Git/a1/.worktrees/implementation-progress-checklists` worktree and draft PR #757 after the maintainer approved the recommended approach and explicitly requested implementation.

## Results

- Delivery policy, the first-party skill, and the runbook now require two to ten unchecked, outcome-sized Implementation items in new draft PRs, marker-only ordinary progress updates, approved scope refinement for text or membership changes, and all-checked readiness.
- Version-3 body parsing recognizes strict task-list Implementation sections, rejects malformed, mixed, duplicated, generic, or incomplete lists, and preserves historical all-plain Implementation bodies.
- Final Acceptance remains plain behavior-and-result bullets, and authorized maintainer integration remains the acceptance decision.
- This PR demonstrated the workflow by moving its GitHub-visible progress from zero to three of four items through marker-only body edits before completion.

## Validation

- `npx vitest run test/repository-governance/openspec-acceptance-checklist.test.ts test/repository-governance/change-delivery-guidance.test.ts test/repository-governance/openspec-delivery-finalization.test.ts --maxWorkers=1` — 3 files and 43 tests passed, including end-to-end refusal of an incomplete PR-body checklist.
- `npx vitest run test/repository-governance/openspec-delivery-finalization.test.ts test/repository-governance/openspec-finalization-publication.test.ts test/repository-governance/openspec-single-pr-github.test.ts test/repository-governance/regression-triage-report.test.ts --maxWorkers=1` — 4 files and 39 tests passed across finalization, publication, exact-head candidate reading, and regression-triage compatibility.
- `npm run build` — passed and produced the generated build prerequisites used by bin typechecking.
- `npm run typecheck` — passed for source and bin configurations after the build prerequisite.
- `npx openspec validate track-implementation-progress --strict` — passed.
- `git diff --check` — passed.

## Known gaps

None. Historical plain-bullet Implementation bodies intentionally remain readable; canonical guidance and regression tests establish the checklist contract for newly authored deliveries without rewriting merged records.

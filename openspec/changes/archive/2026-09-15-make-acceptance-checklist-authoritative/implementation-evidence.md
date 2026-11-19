## Implementation evidence

Recorded for the implementation candidate in PR #413; these automated fixtures are not maintainer acceptance.

- `npm run typecheck` — passed after the final policy and fixture updates.
- Focused acceptance/archive suite — 70 tests passed across checklist parsing, policy, GitHub publication/receipt consumption, archive staging/publication/workflow, cleanup, and delivery guidance.
- `npx vitest run test/repository-governance --maxWorkers=1 --minWorkers=1` — initial broad run passed 786 of 787 tests; the sole failure was an old fixture expecting pending source tasks to block acceptance. The fixture was updated to the approved checked-checklist authority, and `openspec-archive-github.test.ts` then passed all 24 tests.
- `npm run check:docs-governance` — passed with the inventoried legacy count unchanged.
- `npm run check:code-documentation:changed` — passed with no violations.
- `openspec validate make-acceptance-checklist-authoritative --strict --no-interactive` — passed.
- `git diff --check` — passed.
- PR CI run `34957780031` — acceptance policy, naming, documentation, containment, and startup checks passed; Fast validation exposed two inherited `release-gc.test.ts` cases whose correct retry behavior exceeded the suite's default 5-second timeout under loaded CI. Both assertions and behavior were preserved while their explicit per-test budget was raised to 15 seconds; the focused file passed 21/21 before the repair commit.

No local `test:fast`, `test:full`, or `test:release` run was claimed or performed. Normal current-head PR CI remains the required automated gate after the candidate is marked ready.

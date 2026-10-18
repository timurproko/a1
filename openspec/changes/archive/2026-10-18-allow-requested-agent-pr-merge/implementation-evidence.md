# Implementation Evidence

## Delivered behavior

- Always-loaded agent context and the delivery skill permit one protected squash merge only after an authorized maintainer explicitly requests the identified currently eligible PR in the current interaction.
- Delivery guidance requires an immediate authoritative refresh of the exact finalized head, acceptance list, current `develop`, `Development validation required`, `MERGEABLE`/`CLEAN` state, and authenticated human `User` permission before expected-head integration.
- Changed, pending, failed, stale, unavailable, ambiguous, draft, forked, or automation-credential candidates remain unmerged; the agent never waits, watches, arms auto-merge, uses merge queue, retries later, or bypasses protection.
- Conditional acceptance wording recognizes the maintainer's requested direct merge while existing shared provenance continues to require the exact head, authorized human actor, required check, merge event, merge commit, and target ancestry.

## Validation

- `npm run build && npm run typecheck` — passed.
- `npx vitest run test/repository-governance/change-delivery-guidance.test.ts test/repository-governance/openspec-delivery-policy.test.ts test/repository-governance/openspec-acceptance-policy.test.ts test/repository-governance/openspec-single-pr-github.test.ts` — passed: 49 tests across 4 files.
- `npm run check:docs-governance` — passed with 74 inventoried legacy occurrences matching.
- `npx openspec validate allow-requested-agent-pr-merge --strict --no-interactive` — passed.
- `git diff --check`, the `AGENTS.md`/`CLAUDE.md` byte comparison, and the first-party skill size guard — passed.

## Bootstrap and live exercise

This policy PR must integrate through the previously deployed maintainer-owned route. After it reaches `develop`, a later finalized candidate can exercise the new route by receiving an explicit exact-head merge request, using the documented expected-head protected squash merge, and completing ordinary read-only accepted/archive verification and cleanup.

## Known gaps

None.

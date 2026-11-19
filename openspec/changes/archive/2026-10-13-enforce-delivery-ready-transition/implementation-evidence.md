# Implementation evidence

## Focused behavior

- Added identical always-loaded `AGENTS.md` and `CLAUDE.md` delivery rules. Guidance tests verify skill loading, immediate checkbox progress, workflow-owned readiness, the prohibition on agent ready mutations, blocker reporting, and separation from GitHub check counts.
- Extended trusted finalization to admit draft inspection without admitting forked or malformed identities. A complete current-form task-list draft is validated against its exact body, head, base SHA, active OpenSpec tasks/evidence, acceptance scenarios, target specs, and archive simulation before the App performs only `markPullRequestReadyForReview`.
- Made the all-checked body state the automatic readiness signal while preserving the existing ready event as the only branch-finalization path. Fixtures prove draft promotion itself writes no branch or body content, and the next ready event performs ordinary finalization.
- Added fail-closed fixtures for unchecked items, historical plain bullets, body races, foreign draft heads, incomplete detailed tasks, branch push races, and finalization conflicts. Existing publication route tests confirm the App still cannot invoke a merge route.

## Commands and results

- `npm exec vitest run -- test/repository-governance/openspec-finalization-publication.test.ts test/repository-governance/openspec-archive-workflow.test.ts test/repository-governance/change-delivery-guidance.test.ts test/repository-governance/openspec-archive-publication.test.ts` — 4 files and 38 tests passed.
- `npx tsgo -p tsconfig.json --noEmit` — passed.
- `node --check scripts/governance/openspec-finalization-publication.mjs` and `node --check scripts/governance/openspec-archive-publication.mjs` — passed.
- `npm run check:docs-governance` — passed with 74 inventoried legacy occurrences.
- `GH_TOKEN="$(gh auth token --user timurproko)" npm run check:repository-governance` — live repository policy matched with no differences.
- `openspec validate enforce-delivery-ready-transition --strict` — passed.
- `npm run typecheck` completed the source/test project, then its bin project could not resolve `dist/**` because this clean worktree had not produced a build. The equivalent focused source/test command above passed; exact-head CI retains the build-backed bin check.

## Known gaps

None. Promotion starts validation but never accepts, arms auto-merge, or merges the implementation pull request.

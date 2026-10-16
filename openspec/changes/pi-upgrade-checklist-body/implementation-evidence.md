# Implementation evidence

## Focused behavior

- The Pi upgrade renderer emits the ordinary delivery layout: the proposal sentence, four fixed unchecked implementation outcomes, one generated acceptance outcome naming the new version and short upstream commit, and the automation block. The report test parses the generated body through the real checklist, implementation-only, and acceptance validators, incomplete as generated and complete once every outcome is checked, and keeps the proposal within the layout bounds when every gate fails on a prerelease version.
- The version delta, changelog excerpt, and report are rendered as a sync report comment, with one intro for a scheduled run and another for a refresh; the scaffold's design records the opening report when the sync writes the scaffold.
- The workflow posts the comment after `gh pr create` and on every later run against an open proposal, never calls `gh pr edit`, and no longer runs the removed marker refresh script.

## Commands and results

- `npx vitest run test/repository-governance/pi-upgrade-report.test.ts test/repository-governance/pi-upstream-sync-workflow.test.ts` — 2 files, 15 tests passed.
- `npx tsgo -p tsconfig.json --noEmit` — passed.
- `node --check scripts/pi/pi-upgrade-report.mjs` and `node --check scripts/pi/propose-pi-upgrade.mjs` — passed.
- `npx openspec validate pi-upgrade-checklist-body --strict` — valid; `openspec status` reports every artifact done.
- `npm run check:docs-governance` — passed with 74 inventoried legacy occurrences.
- `npx vitest run test/repository-governance` — 147 of 148 files passed; `startup-descriptor.test.ts` needs a built `dist`, which this clean worktree does not produce.
- `npm run preflight` — passed, including the selected repository-governance and Pi test groups.

## Known gaps

None. Readiness, finalization, branch ownership, skip, freeze, and refresh policy are unchanged; exact-head CI retains the build-backed checks.

# Implementation evidence

## Focused behavior

- The triage report renderer emits the ordinary delivery layout: the proposal sentence, two fixed unchecked implementation outcomes, one generated acceptance outcome naming the failed run's date and workflow, and the automation block carrying the triage key line before the implementation fence. The report test parses the generated body through the real checklist and acceptance validators, incomplete as generated and complete once both outcomes are checked, and proves the key still reads.
- The run evidence is rendered as a triage comment, with an opening sentence for a new candidate and another for a refresh, and the change's design and provenance keep receiving the same record.
- The proposal script posts the comment after `gh pr create`, posts another comment on a refresh, never calls `gh pr edit`, and routes `gh pr comment` through the App token like creation.

## Commands and results

- `npx vitest run test/repository-governance/regression-triage-report.test.ts test/repository-governance/regression-triage-proposal.test.ts` — 2 files, 19 tests passed.
- `npx tsgo -p tsconfig.json --noEmit` — passed.
- `node --check scripts/release/regression-triage-report.mjs` and `node --check scripts/release/propose-regression-fix.mjs` — passed.
- `npx openspec validate regression-repair-checklist-body --strict` — valid.
- `npm run check:docs-governance` — passed with 74 inventoried legacy occurrences.
- `npx vitest run test/repository-governance` — 137 of 140 files passed. `startup-descriptor.test.ts` needs a built `dist`, which this clean worktree does not produce; `naming-selection.test.ts` and `validation-impact.test.ts` hit 5-second timeouts and a locked temp directory under full-suite load and passed in isolation (2 files, 22 tests). The guidance, finalization publication, and PR Full regression suites passed in the full run.

## Known gaps

None. Readiness, finalization, selection, and provenance policy are unchanged; exact-head CI retains the build-backed checks.

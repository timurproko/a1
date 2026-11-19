# Implementation evidence

All commands were run from the delivery worktree `D:/Git/a1/.worktrees/report-publication-failure-clearly` on top of `develop` at `5a9aab99`. `test:fast`, `test:full`, and `test:release` were not run; the maintainer did not request them.

## Focused tests

| Command | Outcome |
| --- | --- |
| `npx vitest run test/repository-governance/publication-client.test.ts test/repository-governance/release-pipeline-policy.test.ts` | 17 tests passed. The five new client cases drive `describePublicationFailure` and `dispatchPublication` with an injected fake runner: one failed job with a duplicated message and the generic exit-code annotation yields one deduplicated line; thirty annotations across two jobs cap at ten lines and an unreadable annotation call is tolerated; a failing watch prints the run identifier and URL first and rejects with the readable report; a successful watch returns the run identifier; and the `result` job carries the two summary steps before the byte-identical outcome step. |

## Governance commands

| Command | Outcome |
| --- | --- |
| `npx tsgo -p tsconfig.json --noEmit` | No error in any changed file; the isolated worktree reports only the pre-existing unrelated `#pi-tui` alias errors absent from the primary checkout. |
| `node scripts/governance/check-code-documentation.mjs --mode full` | `Code documentation governance OK: no violations`. |
| `node scripts/governance/product-identifier-policy.mjs --check` | `948 files; 0 violations`. |
| `node scripts/governance/check-docs-governance.mjs` | `Docs-sensitive governance OK`. |

## Not verified locally

The result-job summary runs only when a hosted publication fails. The next failed `npm run develop` is the evidence: the terminal shows `[develop] publication run <id> failed in <jobs>` with the recorded messages and no stack trace, and the run summary lists the same jobs plus non-zero lane invocations.

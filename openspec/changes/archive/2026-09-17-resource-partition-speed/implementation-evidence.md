# Implementation evidence

All commands were run from the delivery worktree `D:/Git/a1/.worktrees/resource-partition-speed` on top of `develop` at `39406693`, after `npm run build` so `dist/` was present as it is on the runner. `test:fast`, `test:full`, and `test:release` were not run; the maintainer did not request them.

## Baseline this change is measured against

Run 35195433396, `Resource-sensitive fast partition` (conservative): setup 35 s, gates 318 s, 22 invocations. `candidate-build` 39.5 s, then 21 `vitest` processes: `session-shell.test.ts` 70.4 s, `local-cleanup.test.ts` 69.3 s, `command-outcome-parity.test.ts` 26.4 s, `clipboard-executor-lifecycle.test.ts` 15.6 s, `release-gc.test.ts` 12.7 s, the other 16 files 2 to 11 s each; about 2 s of the smallest files is process start. Failure shapes from the plan: `local-cleanup.test.ts` SIGTERM at 110021 ms, `session-shell.test.ts` cases at 1026 to 1039 ms against the 5000 ms default, `session-resume.integration.test.ts` "Packaged launch not ready" after 42 s.

## Local measurements

| Command | Outcome |
| --- | --- |
| `node --test test/repository-governance/local-cleanup.node.mjs` before the change | 42 passed, 84.8 s (serial, synchronous Git). |
| Same after `describe(..., { concurrency: 4 })` with the asynchronous Git helper | 42 passed, 41.7 s; width 8 measured 32.4 s and was not adopted. |
| `npx vitest run <all 21 resource-sensitive files> --no-file-parallelism --testTimeout=30000` | 21 files, 484 tests passed in one process, 185 s wall clock including the concurrent cleanup suite. |
| `npx vitest run test/integrations/pi/session-ui/session-shell.test.ts --no-file-parallelism --reporter=json` | 288 passed, 80 s; the slowest cases are 3.6 s (history contention), six hover-checkpoint cases at 2.2 to 3.2 s, and paste reservation at 2.6 s. No case depends on paste settlement alone, which is why the fake helper was not built. |
| `grep -cE "setTimeout\((resolve\|r\|res\|done)[a-zA-Z]*, *[0-9]+"` over the partition | 39 sites in `session-shell.test.ts` (27 zero-delay yields, the rest under one second in total) and 1 in `paste-executor.test.ts`; left unchanged. |

## Focused tests

| Command | Outcome |
| --- | --- |
| `npx vitest run test/repository-governance/resource-sensitive-validation.test.ts test/repository-governance/validation-tier.test.ts test/repository-governance/full-regression-policy.test.ts test/repository-governance/impact-aware-validation-workflows.test.ts test/repository-governance/package-suite-ownership.test.ts test/repository-governance/validation-receipt-workflows.test.ts test/repository-governance/validation-job-selection.test.ts` | 69 tests passed: one `vitest-fast-resource-sensitive` invocation with all 21 files, `--no-file-parallelism`, `--testTimeout=30000`, `timeoutSource: "explicit"`; identical across fast, pull-request, exact-package, and full plans; every matrix entry builds at install time and the `--ignore-scripts` install step is gone. |
| `npx vitest run test/repository-governance` | 1040 of 1045 passed. The five failures (`startup-graph-policy`, `pinned-pi-source-ledger`, `code-documentation` source roles, `terminal-architecture-policy`) each timed out at Vitest's 5000 ms default under the full parallel suite and pass in isolation (60 and 29 tests passed on rerun); they are the same load-sensitive files the previous two changes recorded and are unrelated to this change. `local-cleanup.test.ts` passed inside that run under the new bound. |

## Governance commands

| Command | Outcome |
| --- | --- |
| `npx openspec validate resource-partition-speed --strict` | `Change 'resource-partition-speed' is valid`. |
| `npx tsgo -p tsconfig.json --noEmit` | 0 errors. |
| `node scripts/governance/check-architecture.mjs` | `Architecture boundaries OK`. |
| `node scripts/governance/check-docs-governance.mjs` | `Docs-sensitive governance OK`. |
| `node scripts/governance/check-code-documentation.mjs --mode full` and `--mode changed --selection <impact>` | `Code documentation governance OK: no violations`. |
| `node scripts/governance/product-identifier-policy.mjs --check` | `957 files; 0 violations`. |

## Not verified locally

Runner timing is hosted-runner property. The first conservative post-merge run is the evidence: the resource job's outcome artifact should show two invocations (`candidate-build` skipped as `verified-existing-build`, one `vitest-fast-resource-sensitive`) with gate time well under the 318 s baseline, and no resource-sensitive, cleanup, or resume timeout failure should appear on any pull request for a week.

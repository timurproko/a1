## 1. Partition Shape And Bound

- [x] 1.1 Export `RESOURCE_SENSITIVE_TIMEOUT_MS` (30000) from `scripts/release/validation-tier.mjs`, plan the selected resource-sensitive files as one bounded `vitest-fast-resource-sensitive` invocation with `--no-file-parallelism` and the explicit bound, derive `evidence.testFiles` from the batch, and record `timeoutSource: "explicit"`; update the declaration file; verify the fast, pull-request, exact-package, and full plans produce one invocation carrying all 21 files.
- [x] 1.2 Update `scripts/release/report-resource-sensitive-validation.mjs` to select the partition by execution class, require the explicit bound, record `attentionThresholdMs` and `slowTests` in its evidence, and print the slow list; verify it refuses a plan without the bound.
- [x] 1.3 Repoint `resource-sensitive-validation.test.ts`, `validation-tier.test.ts`, and `full-regression-policy.test.ts` at the single invocation, the explicit bound, and the execution-class selector.

## 2. Slow Tests

- [x] 2.1 Wrap the `local-cleanup.node.mjs` cases in a `describe` with `concurrency: 4`, make the Git helper asynchronous with every call awaited, and raise the wrapper's child bound in `local-cleanup.test.ts` to 180 seconds; verify all 42 cases pass and the file runs in about 40 seconds locally.
- [x] 2.2 Replace the fixed 40-millisecond readiness poll in `session-resume.integration.test.ts` with backoff to a 90-second bound whose failure names the startup phases found in the trace.

## 3. Workflow

- [x] 3.1 Set `build: true` on the resource entry in `scripts/release/validation-matrix.mjs`, remove the unused `--ignore-scripts` install step from the modular job, and pin both in `impact-aware-validation-workflows.test.ts`.

## 4. Governance, Documentation, And Evidence

- [x] 4.1 Rewrite the resource-sensitive section of `docs/ci-release-runbook.md` for the single process, the explicit hang bound, and the `slowTests` report.
- [x] 4.2 Run the planner, workflow-pin, and cleanup tests plus typechecking and the governance commands, and record the commands and outcomes; record the resource job's gate time and invocation count from the first conservative post-merge run and the absence of timeout failures for one week as the post-merge evidence.

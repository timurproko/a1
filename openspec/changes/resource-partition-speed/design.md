# Design

## A hang bound instead of a performance cliff

The partition kept Vitest's five-second default because the earlier isolation change treated any test near that limit as a workload problem to optimize, not a limit to raise. That reasoning holds for a test that takes four seconds on a quiet machine; it does not hold for a runner that is two to four times slower than the last one for the same bytes, which is what the recorded Windows startup samples show (942 to 4477 milliseconds for identical launches). A fixed wall-clock limit on shared hardware turns that variance into failed runs, and every such failure cost a revert, a fix, and a refinalize under the delivery rules in force at the time.

The explicit fast-tier invocations already use `--testTimeout=30000`. The partition now declares the same bound through `RESOURCE_SENSITIVE_TIMEOUT_MS`, and the plan evidence records `timeoutSource: "explicit"` instead of `"vitest-default"` so a reader of the outcome artifact can tell the two apart. Thirty seconds is a hang detector: a test that stops responding still fails the tier, and nothing is retried. The performance signal moves to evidence. `report-resource-sensitive-validation.mjs` keeps repeating the partition, still refuses to run without `--no-file-parallelism`, now requires the explicit bound instead of forbidding one, and lists every test body above `attentionThresholdMs` (five seconds) under `slowTests`; the runbook points a maintainer there when a test drifts.

## One process, one cold start

Per-file processes existed to keep one file's leftover Git, SQLite, editor, and child-process load from eating the next file's five-second budget. With a thirty-second bound that protection is no longer worth twenty cold starts, about two seconds each on the Windows runner. `boundedVitestInvocations` already batches file lists under the portable command bound and gives a single batch the bare id, so the invocation is `vitest-fast-resource-sensitive` with all selected files, and any future overflow becomes `-1`, `-2` batches without a code change. Vitest's default `isolate` still gives every file a fresh module context; the local run of all 21 files in one process passed 484 of 484 cases. The `evidence.testFiles` list is derived from the batch arguments, so a split batch reports only its own files.

The report script and the governance tests select the partition by `evidence.executionClass === "resource-sensitive"` instead of an id prefix, so the id shape is no longer load-bearing.

## The cleanup suite runs its cases side by side

`local-cleanup.node.mjs` has 42 cases and each one builds its own temporary repository with a worktree; the cost is Git, not the code under test. The cases already own disjoint temporary directories and pass explicit `cwd` values, so they can run concurrently. `node:test` runs top-level tests serially, so the file wraps them in one `describe` with `concurrency: 4`; four is the runner's core count and keeps Git and child-process load predictable. Concurrency only helps if the fixture yields, so the synchronous `execFileSync` Git helper becomes an asynchronous one and every call site awaits it. Locally the file drops from about 100 seconds to about 40 with width 4 (32 with width 8). The wrapper's child bound goes from 110 seconds, which the serial suite exceeded on a slow runner, to 180 seconds; it is a hang detector for a child that never finishes, not a budget.

## Resume readiness reports what it saw

The readiness wait polled the trace file every 40 milliseconds against a 30-second deadline and then threw the raw process output. It now backs off from 40 milliseconds to one second and gives up after 90 seconds, which is generous for a launch that will become ready and irrelevant for one that will not. On expiry the message lists the `phase` values found in the trace, so a failure reads "phases reached: bootstrap-selected, guardian-start" instead of a wall of shell output; the caller's own phase diagnostic is unchanged.

## Build once, verify the receipt

The resource matrix entry was the only one with `build: false`: it installed with `--ignore-scripts` and then paid `npm run build` inside the tier, including an uncached guardian compile, because the cache step is keyed on `matrix.build`. Setting `build: true` moves the build into `npm ci` like every other entry, restores the guardian cache, records the receipt at install time, and lets the tier's existing `verified-existing-build` path skip the second build. The `Install exact analysis dependencies` step in the modular job then has no consumer and is removed. The planner's rule that the partition `requiresBuild` is unchanged; `clipboard-packaged.test.ts` still consumes the emitted paste helper from `dist/`.

## Not done here

The plan's fake in-process paste helper is not built: `session-shell.test.ts` already forks the emitted `dist/` helper without `tsx` through `test/support/cold-clipboard-entries.ts`, and its 70 seconds are spread across 288 cases (hover checkpoints at three seconds each, clipboard baselines, path-list bounds), not concentrated in paste settlement. Splitting that file along source seams is the architecture plan's item, not this one. The `setTimeout` sleep sweep is also not done; measurement showed the sleeps in the partition sum to under one second.

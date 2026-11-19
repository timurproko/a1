## Why

The Full regression run of 2026-09-19 failed on `develop` at `30546e1` (https://github.com/timurproko/a1/actions/runs/35429594510). Failed: `deprecated-dependencies` (dependency-policy) on macos-15-node24, ubuntu-24.04-node24, windows-2025-node24. Orchestration failures: lane windows-2025-node22 in job `Complete non-physical regression (windows-2025, node 22)`. The nightly triage opened this change so the fix starts from the recorded evidence instead of the failure email.

## What Changes

- Re-pin the documented deprecated-dependency exceptions to the current pinned Pi (0.85.1) after re-evaluating that the same two transitive packages, versions, paths, and reasons apply, and tie the exceptions to the pinned identity in the governance tests so a Pi upgrade cannot leave them stale.
- Measure pi-tui module identity in the installed-tree test the way the product resolves it (a real Node process with the loader hook and `import.meta.resolve`), so the test holds on Node 22, where CommonJS resolution ignores synchronous hooks, without weakening the invariant on Node 24.
- Await a paste helper's IPC channel closure in the executor lifecycle test instead of sampling it right after exit, since Linux closes the channel asynchronously.
- Make every Full regression lane and every Development validation lane that packs the candidate use the pinned `packageManager` npm, and make the candidate packaging script refuse an npm whose pack runs `prepare` despite `--ignore-scripts` (npm 10), so the Node 22 lane no longer rebuilds the workspace mid-pack and fails its build receipt.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `isolated-regression-testing`: the no-deprecated-dependencies requirement states the documented pinned-Pi exception it already carried in code, and that a Pi upgrade re-evaluates it.

## Impact

Recorded in the pull-request body: failed commands per lane, their test files, a bounded log excerpt, and the `develop` commits since the last successful run (0 since `6c97783`).

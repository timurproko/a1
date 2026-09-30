## Why

Full regression run `36400505675` completed its Windows Node 24 lane in 33.2 minutes and Windows Node 22 lane in 29.4 minutes, while macOS finished in 11.1 minutes and Linux in 7.7 minutes. The Windows lane currently executes every validation partition sequentially on one runner; its 900-second ordinary partition, 251-second resource-sensitive partition, and 368-second rendering partition leave independent work on the critical path even though the workflow already has exact scope ownership and aggregate evidence.

## What Changes

- Partition each Windows Full regression runtime into reviewed `core`, `resource`, `rendering`, and `package` shards that run on separate hosted runners.
- Keep every current `full-release` scope, test, assertion, timeout, runtime, and Defender-backed first-attempt startup scenario, while assigning each owned command and test invocation to exactly one shard.
- Merge exact-run shard outcomes into the existing Windows lane identity only after every expected shard succeeds, then retain the existing four-lane protected aggregate.
- Preserve actionable nightly triage, startup trend evidence, per-owner timing, and fail-closed behavior for missing, duplicated, stale, cancelled, or failed shard evidence.
- Leave Linux, macOS, local `npm run test:full`, and stable/nightly publication validation behavior unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: Full regression runs independent Windows partitions concurrently while preserving one complete exact-run result for each supported Windows runtime.
- `isolated-regression-testing`: Windows shard boundaries retain resource-sensitive serialization, rendering isolation, exact-package startup ordering, and complete published-predecessor coverage.

## Impact

- Changes Full regression workflow orchestration, validation planning/evidence, regression triage, and their repository-policy tests.
- Repeats checkout and dependency/build preparation across Windows shards to reduce elapsed time without sharing mutable workspaces or weakening fixture isolation.
- Does not remove either Windows runtime, reduce predecessor count, increase workers or timeouts, add retries, disable Defender, or change release/publication authority.
- Does not parallelize rendering producers or resource-sensitive files inside one runner; only independent hosted-runner shards execute concurrently.

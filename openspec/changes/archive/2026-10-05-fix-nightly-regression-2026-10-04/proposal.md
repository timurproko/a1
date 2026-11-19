## Why

The 2026-10-04 Publish run failed on Windows Node 22 when the multi-process prompt-history concurrency test exhausted its unchanged 15-second timeout inside the parallel full-validation remainder. The test launches concurrent TypeScript child processes and mutates shared SQLite storage, but unlike the prompt-history store suite it is missing from the existing resource-sensitive partition that protects those workloads from runner contention.

## What Changes

- Classify `test/features/prompt-history/concurrency.integration.test.ts` in the authoritative resource-sensitive suite so complete and pull-request validation run it exactly once without file parallelism.
- Strengthen validation-plan coverage to require the test's exclusion from the parallel remainder and ownership by the serial resource shard.
- Preserve the test's assertions, workload, timeout, retry behavior, and supported platform/runtime coverage.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. The existing continuous-integration and isolated-regression-testing specifications already require subprocess and temporary-storage workloads to use the declared resource-sensitive execution class; this change corrects the suite membership.

## Impact

The implementation is limited to validation suite configuration and its governance tests. Product prompt-history behavior and the concurrency test itself remain unchanged.

# Proposal

## Why

Two tests fail intermittently for reasons unrelated to what they check, and each intermittent red run costs a rerun and trust in the suite:

- **`test/foundation/release/update-launch.test.ts`, "runs two concurrent launches independently".**
  - It starts two bootstraps, assumes the first one to reach `spawn` belongs to the first bootstrap, closes the second recorded child with exit code 3 and waits for the second bootstrap to return 3.
  - The two bootstraps race to `spawn`. Under load the second sometimes gets there first. Closing the second recorded child then settles the *first* bootstrap, and the test waits on the second until the 5-second timeout.
  - Instrumented runs confirm it: every failing run logs `first settled 3` before the timeout. It was the only failure among 4,681 tests in `npm test` on Windows, and it passes alone because the order rarely flips without load.
  - The product behaviour is correct: each launch returns its own child's exit code. Only the test's bookkeeping assumes an order the code never promised.
- **`test/integrations/pi/engine/compaction-progress.integration.test.ts`.**
  - Under parallel stress on Windows it failed in its `finally` block with `EBUSY: resource busy or locked, rmdir` on its temporary directory, after the test's own assertions had passed.
  - A pinned-Pi file handle can still be closing when the directory is removed. Other tests in the repository already remove such directories with `rm(..., { maxRetries: 10, retryDelay: 100 })`.

## What Changes

- **The concurrent-launch test stops assuming spawn order.** It closes one recorded child, asserts that exactly one launch settles with that child's exit code while the other is still running, then closes the other child and asserts the remaining launch returns its code. It keeps the distinct notice-path and selected-release assertions.
- **The compaction-progress test removes its temporary directory with bounded retries**, as the repository's other process-owning tests do. Its assertions are unchanged.
- **Unchanged.** No test receives a larger timeout, a new execution class, or an automatic retry of a failed assertion, and no product code changes.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `isolated-regression-testing`: concurrency tests assert outcomes without assuming an unspecified ordering, and test temporary-directory teardown tolerates a Windows handle that is still closing.

## Impact

- `test/foundation/release/update-launch.test.ts`.
- `test/integrations/pi/engine/compaction-progress.integration.test.ts`.

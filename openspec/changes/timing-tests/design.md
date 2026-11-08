# Design

## Context

The `isolated-regression-testing` spec gives contention timeouts one remedy: a test that passes independently but times out while sharing the parallel runner may join the declared resource-sensitive class, with its evidence recorded. It forbids larger per-test bounds and retries of semantic failures.

## Decisions

- **Classify, do not extend.**
  - Evidence: alone, the concurrent-launch test body takes 68 ms; in `npm test` on Windows it timed out at 5.05 s in the parallel remainder.
  - Cause: six `fsync`ed release-state commits in setup plus two bootstraps contending for the same lock, all on storage shared with the parallel pool.
  - The test is appended to `fast-resource-sensitive`, after the other release-state members, and the policy test's pinned list follows.
  - Its isolated duration is far below the five-second optimisation threshold, so serial execution is sufficient.
- **Retry teardown, not assertions.**
  - Only the final `rm` of the test's own temporary directory gains `maxRetries: 10, retryDelay: 100`, matching `prompt-history/concurrency.integration.test.ts` and the parity tests.
  - A failure before teardown still fails the test on its first attempt.

## Risks

- **The resource-sensitive partition gets slower.** Mitigation: the added file takes well under a second alone, and the partition is already serial.
- **A real handle leak could be masked.** Mitigation: the retries are bounded to about one second, so a handle that never closes still fails the test.

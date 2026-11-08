# Design

## Context

The concurrent-launch failure first looked like storage contention, because it appeared only under load and ended at the 5-second timeout. Isolating it showed otherwise. The test passes alone with `it.only` even under load, and in the full file under load the failing runs always log `first settled 3`: the first bootstrap had received the exit code meant for the second. The failure is an ordering assumption that load makes visible, so moving the test into the serial resource-sensitive class would only make the flip rarer.

## Decisions

- **Assert what independence means, not an order.**
  - Two launches are independent when closing one launch's UI child settles exactly that launch with that child's exit code and leaves the other running.
  - The test records which launch settles, and with what code, after each child closes, instead of naming launches by position.
  - Both launches still receive distinct exit-notice paths and select the target release.
- **Retry teardown, not assertions.**
  - Only the final `rm` of the compaction test's own temporary directory gains `maxRetries: 10, retryDelay: 100`, matching `prompt-history/concurrency.integration.test.ts` and the parity tests.
  - A failure before teardown still fails the test on its first attempt.
- **No classification change.** The concurrent-launch test takes milliseconds and does not need serial execution once it stops depending on spawn order.

## Risks

- **The rewritten test could pass while one launch steals the other's child.** Mitigation: it asserts that exactly one launch settles after the first close, with that close's code, and that the other settles only after the second close, with the second code.
- **A real handle leak could be masked.** Mitigation: the retries are bounded to about one second, so a handle that never closes still fails the test.

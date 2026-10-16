## Why

The macOS resident-tab latency gate failed PR #776 with `inputToProcessMs=94.859916ms>16ms`, although nothing in that change touches the measured path. Ten of the run's 23 input samples were negative: the harness matched a processed-input line the fixture printed before the measured send. The summary silently dropped those samples, so p95 over the remaining 13 was their maximum, which is always the cold first input. The previous green run had the same shape and passed only because its cold input took 15.2 ms against the 16 ms budget.

## What Changes

- Time each input only against a fixture line stamped at or after that send, so stale lines for the same token no longer produce negative samples.
- Fail a metric that records a negative or non-numeric latency and report how many samples it rejected, instead of dropping them from the p95 set.
- Add focused coverage for stale-line matching, the full-set p95, and rejected samples.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `resident-terminal-host`: Resident latency evidence matches each sample to its own input and treats an invalid sample as a recorded miss.

## Impact

Affected areas are `scripts/development/measure-resident-tabs.mjs`, its type declaration, and a repository-governance test. Budgets, CI wiring, the terminal host, and product behavior are unchanged.

# Proposal

## Why

Two tests fail intermittently for reasons unrelated to what they check, and each intermittent red run costs a rerun and trust in the suite:

- **`test/foundation/release/update-launch.test.ts`, "runs two concurrent launches independently".**
  - Run alone it takes 68 ms. In `npm test` on Windows it timed out at 5.05 s while sharing the parallel worker pool; it was the only failure among 4,681 tests.
  - Its setup commits release state six times through the `fsync`ed release-state lock, and the test then runs two real bootstraps that contend for that lock. Under a full parallel run, disk latency from hundreds of concurrent tests turns those commits into seconds.
  - That is the resource-sensitive profile the testing spec defines: the test mutates temporary storage and coordinates release processes. Its neighbours `release-state.test.ts` and `update-activation.test.ts` are already in the resource-sensitive class for the same reason.
- **`test/integrations/pi/engine/compaction-progress.integration.test.ts`.**
  - Under parallel stress on Windows it failed in its `finally` block with `EBUSY: resource busy or locked, rmdir` on its temporary directory, after the test's own assertions had passed.
  - A pinned-Pi file handle can still be closing when the directory is removed. Other tests in the repository already remove such directories with `rm(..., { maxRetries: 10, retryDelay: 100 })`.

## What Changes

- **`update-launch.test.ts` joins the resource-sensitive class** in `config/validation-suites.json`, so it runs serially with the other release-state tests under the class's shared hang bound. Its assertions and timeout are unchanged.
- **The compaction-progress test removes its temporary directory with bounded retries**, as the repository's other process-owning tests do. Its assertions are unchanged.
- **Unchanged.** No test receives a larger timeout or an automatic retry of a failed assertion, and no product code changes.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `isolated-regression-testing`: the concurrent-launch release test is classified resource-sensitive on recorded evidence, and test temporary-directory teardown tolerates a Windows handle that is still closing.

## Impact

- `config/validation-suites.json` and the class list pinned in `test/repository-governance/validation-suite-policy.test.ts`.
- `test/integrations/pi/engine/compaction-progress.integration.test.ts`.

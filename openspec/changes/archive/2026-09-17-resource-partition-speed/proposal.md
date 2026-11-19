## Why

The resource-sensitive partition is the slowest Development job and the source of most timing-caused pull-request failures. On run 35195433396 it spent 318 seconds in gates: a 40-second build, then 21 separate `vitest` processes, each paying its own cold start, at Vitest's default five-second per-test timeout. `session-shell.test.ts` took 70 seconds for 288 cases and `local-cleanup.test.ts` 69 seconds for a serial `node --test` child bounded at 110 seconds; on a loaded runner the same child was killed with SIGTERM after 110 seconds, and `session-shell` cases measured at 1026 to 1039 milliseconds sit within noise of the five-second cliff. `session-resume.integration.test.ts` polled readiness every 40 milliseconds against a 30-second deadline and failed with "Packaged launch not ready" without saying which startup phase the launch had reached. None of these failures found a regression; the same heads passed on rerun.

## What Changes

- Run every selected resource-sensitive file in one serial `vitest` process (`--no-file-parallelism`) with an explicit `--testTimeout=30000`, the same bound the other explicit fast-tier invocations already carry; record the bound in the plan evidence as explicit. The bound is a hang detector; per-test durations stay in the reporter evidence and the focused timing report names every test body above five seconds under `slowTests`.
- Run the `local-cleanup.node.mjs` cases concurrently (width 4) with an asynchronous Git helper, and raise the wrapper's child bound to a 180-second hang detector; locally the file drops from about 100 seconds to about 40.
- Poll resume readiness with exponential backoff (40 milliseconds doubling to 1 second) to a 90-second bound and report the startup phases reached from the trace when it expires.
- Give the resource matrix entry an install-time build like every other entry, so the guardian compiler cache applies and the tier verifies the build receipt instead of building again; remove the now-unused `--ignore-scripts` install step from the modular job.
- Rewrite the partition's spec text and runbook section: the per-test bound is explicit and shared, not a performance assertion, and slow tests surface as evidence rather than as pull-request failures.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: The resource-sensitive partition is one serial process under an explicit thirty-second hang bound; slow test bodies are named in evidence instead of failing on the former five-second default.
- `isolated-regression-testing`: The resource-sensitive class runs in one process under the shared explicit hang bound, and resume readiness polls with backoff to one generous bound while reporting reached phases.

## Impact

Implementation affects `scripts/release/validation-tier.mjs` and its declaration, `scripts/release/report-resource-sensitive-validation.mjs`, `scripts/release/validation-matrix.mjs`, the `modular` job in `.github/workflows/ci.yml`, `test/repository-governance/local-cleanup.test.ts` and `local-cleanup.node.mjs`, `test/foundation/release/session-resume.integration.test.ts`, the governance tests that pin the partition shape, `docs/ci-release-runbook.md`, and the two capabilities above. It does not change partition membership, the ordinary remainder's timeout, package, startup, or rendering owners, retry policy, or which runner the partition uses. The fixed `setTimeout` sleeps the plan listed were measured and left alone: 27 of the 39 in `session-shell.test.ts` are zero-delay yields and the rest sum to under one second.

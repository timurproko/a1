## Why

Windows Node 24 Full regression [34871471606](https://github.com/timurproko/a1/actions/runs/34871471606) failed with an unhandled Vitest `onTaskUpdate` RPC timeout despite all 284 executed test files passing. The published-predecessor update test synchronously waits for potentially slow npm subprocesses, blocking its worker event loop; this is a concrete responsiveness hazard and a plausible, not yet proven, explanation of the historical RPC failure.

## What Changes

- Replace synchronous subprocess waits in the predecessor-update test with awaited asynchronous execution, keeping runner messages and timers serviceable while npm runs.
- Preserve command order, sanitized npm environment, temporary installation prefixes, output/error handling, exact candidate bytes, predecessor selection, and use of each predecessor's own release code.
- Make subprocess completion, failure, bounded output, and owned-child cleanup explicit; report bounded phase/version/timing context without leaking credentials or silently accepting failed proxy synchronization.
- Add deterministic process-handshake regressions proving responsiveness and fail-closed subprocess handling, then validate the actual published-predecessor gate and all four native Full regression lanes.
- Preserve existing hook/test/warmup/RPC/workflow time limits, assertions, default predecessor count, suite ownership, and all independent rendering/input gates. No blind retries, sleeps, skips, dependency changes, or worker-pool reshuffling.
- Make successful nightly recovery the completion criterion: after accepted fixes merge, verify a newly numbered merged package in the real scheduled nightly Release workflow, with all four full-release lanes and the aggregate publication/verification result passing. A focused test, branch Full regression, or successful manual development-publication no-op is not the finish line.
- Track every remaining failed stage through diagnosis and an approved correction; do not close the recovery effort while another stage remains red. Additional code scope must be reconciled with the plan before implementation rather than silently weakening or dropping that stage.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `isolated-regression-testing`: Require published-predecessor subprocess waits to leave the test worker responsive while retaining exact-artifact compatibility checks and fail-closed child lifecycle handling; define completed nightly recovery using exact numbered merged-package and all-lane scheduled-run evidence.

## Impact

- `test/foundation/release/update-predecessor.integration.test.ts`, a narrowly scoped test-support subprocess helper if needed, and focused regression fixtures/tests.
- Approved integration refinement: adapt the stale `.copyText` assertion in `test/integrations/pi/session-ui/transcript-presentation-lifetime.test.ts` to the current selection-snapshot API using the existing copy serializer. Preserve the exact `COPY_CURRENT` oracle and all lifecycle scenarios; no production clipboard change or new rendering exception.
- No production updater, published predecessor code, dependency, source ledger, baseline, workflow, or validation-scope configuration change is planned. If asynchronous waiting does not resolve the failure, preserve the evidence and seek a scope refinement rather than weakening a gate.
- Planning base `586c48f8cda30ad89358a16160528746b4446253` already includes merged input-accounting #398 and trust-path #390. Their acceptance/archive and older merged-package obligations remain separate; this plan does not claim them complete.
- OpenSpec-only planning in one draft PR. After approval and a separate implementation request, implement in that same PR, then use the maintainer-approved ready-before-CI sequence; do not merge the plan or archive it ahead of implementation.

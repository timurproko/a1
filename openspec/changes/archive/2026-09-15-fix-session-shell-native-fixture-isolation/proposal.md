## Why

PR #405 merged after ordinary CI passed, but its exact-head Full regression `34940561468` failed four additional Windows Node 22 shell-paste cases while Linux, macOS, Windows Node 24, the original two shell owners, and the release-command correction passed. The failures all retained generic pending paste markers across existing assertion boundaries, showing that #405 removed test-only TypeScript worker startup from too narrow a subset of the same integration fixture.

## What Changes

- Replace #405's mutable, per-test cold-worker selection with immutable file-owned routing for the session-shell integration fixture: every paste helper and only the exact image-worker source bootstrap use the current build's real emitted JavaScript entry.
- Preserve cold process/worker creation on every request, real asynchronous acquisition/classification/conversion, exact payload and submission assertions, original executor capacity, and every existing wait/test deadline.
- Prove the routing changes no worker data or options except the required source-bootstrap `eval` flag, leaves unrelated workers untouched, and retains independent source/emitted helper and worker contract coverage.
- Add focused regression evidence for the four newly exposed owners and failure-safe shell cleanup without retries, sleeps, prewarming, shared mutable fixture state, or synthetic completion.
- Record #405's actual merge and exact-head CI/Full outcomes without inventing acceptance, then require ordinary PR CI and a new exact-head four-lane Full regression before maintainer review or merge.
- Retain the requirement for a newer numbered merged-package scheduled nightly containing #402, #405, and this follow-up before recovery acceptance or archival.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `isolated-regression-testing`: Require a file-owned integration fixture to select real emitted cold helper/worker entries immutably when source-loader overhead is outside the behavior under test, while preserving source-contract coverage, unrelated workers, asynchronous boundaries, and existing assertions and deadlines.

## Impact

- Expected implementation surface: `test/integrations/pi/session-ui/session-shell.test.ts`, `test/integrations/pi/session-ui/cold-clipboard-entries.test.ts`, and narrowly related `test/support/cold-clipboard-entries.ts` support.
- Related evidence-only reconciliation may update `openspec/changes/fix-native-regression-fixture-contracts/evidence.md` and completed native/CI task checkboxes, while retaining its failed Full regression, missing acceptance, and unfinished recovery/archive tasks.
- No production shell, clipboard, helper, worker, executor, updater, or release code changes are authorized. No dependency/lockfile, workflow, suite classification, pool, timeout, retry, sleep, workload, assertion, baseline, source-ledger, rendering/input budget, or executor-capacity change is authorized.
- Planning base: #405 merge `2d992336c48790fb2f793883816905c9db2ec5e7`; candidate source `2d0dd1503edda48f8ad18075256c45b0fb59e177`. Ordinary CI `34940561264` passed. Full regression `34940561468` passed Linux Node 24, macOS Node 24, and Windows Node 24, but Windows Node 22 failed four shell cases after 3291 tests passed.
- #405 remains merged but unaccepted and unarchived. This follow-up cannot retroactively fabricate its pre-merge acceptance; final reconciliation requires actual combined recovery evidence and explicit maintainer disposition.

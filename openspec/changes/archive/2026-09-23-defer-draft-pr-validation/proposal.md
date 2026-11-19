## Why

Development validation can start expensive test suites while a pull request is still draft and can start again on a ready implementation head immediately before OpenSpec finalization pushes its authoritative candidate. Those runs are acceptance loops over heads that cannot be merged and can duplicate the exact-head run required after finalization.

## What Changes

- Keep all pull requests test-free while draft, including generated failed-regression repairs that would otherwise select PR-attached Full regression.
- Add a trusted readiness decision ahead of Development validation so a version-3 implementation waits for its finalized metadata before test selection begins.
- Run ordinary selected validation once when a non-OpenSpec pull request becomes ready, and run implementation-bound validation on the finalized exact head.
- Continue canceling superseded validation for later pushes, body changes, or conversion back to draft without reusing stale evidence.
- Preserve every existing selected owner, Full regression lane, assertion, timeout, failure condition, and protected aggregate once validation is eligible to run.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: defer pull-request test execution until review readiness and, for version-3 delivery, until trusted finalization metadata identifies the validation candidate.

## Impact

Implementation is expected to update the Development validation workflow, add a base-controlled readiness classifier, revise workflow contracts and delivery guidance, and preserve the existing impact and Full regression selectors unchanged after the readiness gate opens. Scheduled, manually dispatched, release, publication, and post-merge workflows remain independent.

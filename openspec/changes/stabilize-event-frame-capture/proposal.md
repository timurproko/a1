## Why

PR #373 originally exposed a timing-sensitive event-frame hash mismatch; the independently merged #374 repair resolved that observed failure, and the accepted selection fix subsequently merged and was archived through #384. This already-merged #379 plan remains active to close its stronger capture-boundary, bounded-settlement, callback-interleaving, and cleanup-isolation obligations without duplicating #374 or weakening ANSI comparisons.

## What Changes

- Reuse #374's controlled clock, normal/delayed repetitions, restoration checks, shared generator, and strict first-difference diagnostics, with their recorded evidence credited explicitly.
- Use the preserved pre-fix divergence evidence to identify and encode the responsible callback ordering; distinguish historical reproduction from regressions exposing remaining gaps on the current implementation baseline.
- Finish explicit event-settlement and render-capture boundaries independent of incidental terminal writes, and declare a finite settlement bound with exhaustion diagnostics.
- Add bounded callback-interleaving, disposal-failure, and unrelated-timer isolation coverage while preserving the common test/generator capture policy and strict state, geometry, semantic ANSI, cursor, and clearing-order assertions.
- Preserve the existing declared truecolor scope and opposing-ambient-capability coverage; do not modify runtime rendering or the selection fix.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This repairs test/fixture determinism without changing product requirements or validation policy. The change declares `skip_specs: true`, consistent with the existing `make-parity-color-depth-deterministic` tooling change.

## Impact

- Expected implementation: `test/features/owned-ui/pi-event-frame-parity-fixture.ts`, its focused test, and narrowly scoped test support; the existing `scripts/pi/update-pi-event-frame-parity.ts` entry point must consume the same deterministic producer.
- Stored diagnostic output is not an independent parity authority. Preserve its payload where possible; any necessary capture-boundary correction must be explained and reviewed rather than blindly regenerating a golden file.
- No production source, installed dependencies, public APIs, CI workflow changes, timeout increases, or runtime scheduling changes are authorized by this proposal.
- This is an OpenSpec-only revision of legacy planning PR #379, not a new implementation, acceptance record, or completed archive. No implementation PR for the remaining work was found during reconciliation at `5a416891`.
- Subsequent implementation requires an explicit request and follows the repository's legacy merged-plan route, retaining #379's linkage and citing this revision. PR #373's accepted candidate already passed required CI and merged; this tooling plan neither blocks nor reopens its acceptance.

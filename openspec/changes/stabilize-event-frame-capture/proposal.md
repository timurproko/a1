## Why

PR #373's fast validation fails because repeated scripted event-frame captures produce two truecolor diagnostic hashes instead of one. Event-loop pressure reproduced a varying repaint at the `completed` capture boundary, so this test-tooling race must be isolated from the right-edge selection implementation rather than hidden by retries or looser ANSI comparisons.

## What Changes

- Reproduce the capture variation against the implementation baseline and identify which scheduled render crosses the scripted stage boundary.
- Give the scripted fixture explicit, deterministic event-settlement and render-capture boundaries, independent of incidental terminal writes and ambient scheduling delays.
- Keep test and fixture-generation entry points on the same capture policy, including cleanup and restoration after failure.
- Add bounded timing-interleaving regressions and useful first-difference diagnostics while retaining strict state, geometry, semantic ANSI, cursor, and clearing-order assertions.
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
- Separate OpenSpec-only planning PR from current `origin/develop`. A fresh implementation PR follows specification merge and a new explicit implementation request; PR #373 remains blocked until its required checks actually pass.

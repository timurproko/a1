## Why

Windows Node 22 Full regression [34862915590](https://github.com/timurproko/a1/actions/runs/34862915590) failed because input-responsiveness evidence reported one stable transcript block render against the unchanged zero budget, while trust parity and the other three native lanes passed. The current evidence assigns an entire checkpoint's renders and terminal writes to its final frame cause, which cannot reliably distinguish mixed stream/geometry/input frames and does not identify the failing workload in its budget diagnostic.

## What Changes

- Make stable-input render and paint accounting frame-accurate: retain each composition's own cause, render delta, viewport regions, and associated terminal-write range instead of attributing a whole checkpoint to its last frame.
- Preserve zero stable-transcript renders and zero stable-transcript painted rows for `dock-input` frames; retain non-input work in evidence rather than discarding mixed checkpoints or relabeling violations.
- Add bounded first-failure context identifying workload, producer, checkpoint, frame/cause, expected/actual counters, and write range without a second producer capture.
- Add deterministic mixed-frame ordering and malformed-evidence tests that expose both false positives and false negatives, while preserving independent producer semantics, all six workloads, and all four native lanes.
- Treat the accounting flaw as a concrete defect but only a hypothesis for the reported CI failure until reproduced. If frame-accurate evidence proves an actual runtime reuse defect, stop and seek approval for a coherent scope refinement before changing renderer/cache/scheduling behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Strengthen comparative input-responsiveness evidence to attribute render/paint work to the frame that performed it, conserve measured work, reject ambiguous evidence, and identify the first failing frame.

## Impact

- Primarily `test/support/input-responsiveness/` producer capture, protocol validation, matrix accounting, and associated tests, including `input-responsiveness-budgets.test.ts`.
- Prefer existing read-only composition diagnostics and root counters/descriptors; a minimal optional payload-free observation hook is allowed only if required to capture complete boundaries. No runtime cache, scheduling, cause-selection, input semantics, or terminal output behavior change is included in this plan.
- No budget increase, retries, longer settling sleeps/timeouts, widened skips, removed workload, baseline regeneration, dependency change, source-ledger change, workflow change, or published-package mutation.
- Separate draft from #390, based on `origin/develop` at `6788860d`. This plan does not merge, archive, or mark accepted the trust, scoped-model, or original nightly changes. Planning approval/request is required before implementation continues in this same PR.

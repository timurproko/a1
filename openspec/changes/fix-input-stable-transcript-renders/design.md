## Context

See proposal.md for motivation. The failure is [Full regression 34862915590, Windows Node 22 job 104039570489](https://github.com/timurproko/a1/actions/runs/34862915590/job/104039570489), source `ca647b65f6708908d74f6db9f5729fac9647df59`. `input-responsiveness-budgets.test.ts` failed with `stable transcript block renders are 1`; the configured render and painted-row budgets are both zero. The focused trust context suite and independent command-outcome parity passed in that lane. Linux Node 24, macOS Node 24, and Windows Node 22/24 are all required, but only Windows Node 22 failed in this run; Windows Node 24 and both Unix lanes completed successfully.

The downloaded Windows artifact `10356681726` contains `validation/full-regression.json` and `validation/package/npm-pack-result.json`, not the raw input matrices. The outcome report identifies `vitest-isolated-suites` as the failed owner; the aggregate assertion at line 11 does not name the matrix. It is therefore not established whether the reported render belongs to the long-transcript workload, the mixed menu/stream workload, another workload, or a genuine runtime defect.

Source findings:

- `input-producer-worker.ts` records the cumulative render-count difference since the preceding checkpoint and the whole write interval, but reads only the latest `viewportFrameDescriptor()` afterward.
- `input-matrix.ts` charges those entire intervals to stable input whenever that latest cause is `dock-input`. Paint classification has the same interval/cause mismatch.
- `smoke-menu-stream` is included in the full six-workload gate and interleaves stream activity and navigation. Input delivery uses immediates; stream presentation has a 33 ms cadence. This permits different mixtures of frames within a checkpoint without changing semantic input order.
- Existing root counters/descriptors and TUI `composition-start`/`composition-end` diagnostics are observational building blocks. `ComponentBridge.render` reports boundaries around root rendering; root frame descriptors are available after composition. RecordingTerminal retains writes in order.
- No changes to the input-responsiveness support or shell root were found between the failing source and planning base `6788860d`. This change is separate from #390's trust-option correction.

## Goals / Non-Goals

**Goals:** Correct the demonstrable attribution ambiguity, expose the earliest violating frame from the original capture, and preserve the existing zero-work contract so an actual runtime regression remains a failure. Distinguish a reproduction of the accounting flaw from proof of the historical CI cause.

**Non-Goals:** Optimize or alter production rendering, cache invalidation, stream/input scheduling, cause classification, output bytes, or input semantics; relax budgets, producer isolation, six-workload/three-producer structure, error protocols, or any native lane; fix trust/profile behavior; declare unrelated changes accepted.

## Decisions

### 1. Observe complete composition and write boundaries

Record ordered per-composition evidence in the bare-A1 input producer: local sequence/frame identity, actual frame cause, active input revision, transcript render-counter before/after, geometry/viewport regions, and the terminal-write ranges attributable to that composition. A composition with no terminal write still contributes render work. Preserve checkpoint semantic summaries and original raw writes; they are not replaced by an owned expected-output formatter.

Use existing diagnostics and read-only root accessors where possible. If they cannot supply a complete boundary, add only a minimal optional payload-free observation hook at the owned shell/runtime boundary, with no rendering or scheduling side effects when enabled or disabled. Do not change source-synchronized Pi files or introduce private imports. Observation must not call `renderNow`, flush events, invalidate caches, extend settling waits, or otherwise repair the measured product. Existing workload actions and deliberate resize settling remain unchanged.

Terminal diffing can perform multiple compositions, produce no write, or issue controls outside a root composition. Represent those cases explicitly: preserve no-write compositions, associate output using actual ordered boundaries, and retain known non-frame controls separately. If association is ambiguous, fail with bounded evidence instead of guessing from the last descriptor. Keep startup/warmup and teardown boundaries explicit; do not move measured work outside the window merely to make a gate pass.

### 2. Make attribution conservative and check conservation

The protocol validator must reject missing, duplicated, reversed, non-finite, negative, overlapping, out-of-bounds, or unaccounted measured evidence. Validate frame ordering and count continuity, write coverage, checkpoint containment, and render-delta conservation against the original cumulative counters. Known no-frame controls and warmup ranges must be explicit, not a general escape hatch for unexplained work. Existing producer output/time bounds remain unchanged; diagnostics are bounded independently and overflow fails rather than truncating authoritative measurements.

For each actual `dock-input` frame, accumulate only its own transcript render delta and its own painted rows within that frame's transcript region. Other causes keep their actual counters and paints in the evidence. Never infer a non-input cause from a positive render count, discard a mixed checkpoint, subtract an unexplained render, reset a counter after seeing a violation, or add an exception for streaming/Windows/Node 22. A true dock-input render remains a zero-budget violation even if a later frame changes cause.

The protocol is repository-internal: update producer, validator, matrix, and their tests together. Reject old incomplete payloads rather than silently interpreting absent frame evidence as zero. Version the internal result schema if its incompatible requirements require that; no public product API or package dependency changes are needed.

### 3. Diagnose from the existing capture

Budget failures must report workload and producer identities, checkpoint and first violating frame, actual cause, input revision, expected/actual render or paint counter, frame viewport bounds, and relevant write indexes. Use the already captured matrices, phases, and counters; do not launch another producer for diagnostics or rely on a second attempt passing. Bounded structured failure output in the existing CI logs is sufficient; no workflow/upload change is required. Do not dump arbitrary transcript content or environment secrets.

Check the six-workload/three-independent-producer structure and zero deliberate repeat captures remain intact. Existing independent semantic equality, terminal-cell replay, input/backlog/frame limits, and producer startup/error/cleanup checks remain mandatory.

### 4. Prove both directions before claiming a fix

First add deterministic evidence traces for: stream-render then zero-work dock frame (old false positive); a real dock render followed by stream/geometry (old false negative); a single legitimate dock frame; a violating dock frame with no terminal write; multiple compositions per checkpoint; geometry-dependent transcript bounds; unassociated controls; and malformed/missing attribution. Inject a genuine extra stable render and stable transcript-row paint and verify each still fails with the named frame.

Then exercise actual owned producers using controlled scheduling at existing fixture seams to cover both stream-before-input and stream-after-input orderings without changing production cadence or adding sleeps/retries. Compare observed semantic/output results with observation disabled and with the independent comparison producers. Retain actual native runs as authority; synthetic traces alone do not explain the historical failure.

If frame-accurate evidence still reports a real dock-input render, stop with its workload/frame trace and request an approved plan refinement before any runtime cache/scheduler fix. This plan intentionally authorizes evidence repair only; it cannot claim an unresolved product defect fixed or archive with unperformed substantive tasks.

### 5. Integrate without hiding the independent trust blocker

Planning remains OpenSpec-only in one version-2 linked draft. Implementation starts only after approval/request and stays in that PR. Required CI and the existing native Full regression workflow must be evaluated without relaxed gates. #390 remains a separate unmerged candidate; the standalone develop-based source may still hit its known macOS trust mismatch before reaching this gate. If needed, obtain explicit authorization for an isolated combined-candidate validation stream; do not fold #390's source into this change, change the base silently, or claim a blocked full run passed. Final all-lane evidence and integration sequencing must be resolved before completing the validation task.

Source regression is not acceptance of a published package. The original nightly/scoped-model changes retain their newly numbered merged-package validation obligations, and #390 retains its own acceptance/integration obligations. This plan neither checks off nor archives those changes.

## Risks / Trade-offs

- [The historical failure is a real renderer defect] → Per-frame reproduction and an explicit scope gate prevent concealing it with an accounting repair.
- [Recording perturbs scheduling] → Use synchronous, bounded, payload-free observations and enabled/disabled equivalence checks; no observer-triggered rendering.
- [Multiple compositions or unowned terminal controls] → Represent them explicitly and validate conservation; ambiguous evidence fails closed.
- [A new classifier accidentally weakens the oracle] → Preserve actual frame causes, negative mutations, all raw measurements, and the unchanged zero budgets.
- [Native Full regression is blocked by #390 or another gate] → Report separate owners and require authorized integration coordination instead of a false green claim.

## Migration Plan

No user-data migration or dependency change is needed. After explicit implementation approval, ship the producer/protocol/accounting change together with its focused tests. Validate strict OpenSpec, current-head CI, and native evidence, then obtain actual exact-head maintainer acceptance and separate manual merge authorization. Reverting restores the old diagnostic/accounting behavior without modifying application state. Synchronize the delta only through verified archive preparation after substantive completion, and retain worktrees until archive integration is confirmed.

# Implementation evidence

## Authorization

The maintainer approved the plan and then answered “yes” to implementing it in the same draft PR #398. This is implementation authorization, not final acceptance or merge authorization. Work starts from planning head `1bd2c4c1bf9c415f8dfb007e36181aabbac84238`, base `6788860d`, in the existing clean detached worktree `D:/Git/a1/.worktrees/fix-input-stable-transcript-renders`, branch `fix/input-stable-transcript-renders`. Version-2 linkage and mechanical tasks 5.1/5.2 were verified. The draft policy check passed; skipped draft development checks are not implementation CI evidence.

## Original failure

[Full regression 34862915590](https://github.com/timurproko/a1/actions/runs/34862915590), source `ca647b65f6708908d74f6db9f5729fac9647df59`, [Windows Node 22 job 104039570489](https://github.com/timurproko/a1/actions/runs/34862915590/job/104039570489): `input-responsiveness-budgets.test.ts` reported `stable transcript block renders are 1` against budget zero. The failed owner was `vitest-isolated-suites`. Artifact `10356681726` contains aggregate validation and pack results, not the raw matrix or failing workload identity. Trust-context and command-outcome tests passed; Linux Node 24, macOS Node 24, and Windows Node 24 Full regression passed.

Source inspection confirms whole-checkpoint deltas and writes are classified using only the final viewport cause. That accounting defect can produce either direction of error; it does not by itself prove the historical CI failure was a false positive. Budgets and runtime behavior must remain unchanged, and a genuine frame-level defect requires approved scope refinement.

## Implemented correction and local validation

- Extracted the existing checkpoint-based accounting without changing its behavior, then added three deterministic regressions. All three failed: a legitimate stream render/paint was charged to a following dock frame, and real dock work was hidden behind either a later steady or geometry frame.
- Added a synchronous recorder using existing composition diagnostics, root counters/descriptors, and terminal write observations. No production hook or runtime modification was needed. Existing runtime/terminal doubles were extracted unchanged for reuse in observation controls.
- Internal producer/batch payloads are version 2. The validator requires bare-A1 frame evidence and checks ordered identities, causes, render conservation, checkpoint continuity, viewport partitioning, unique complete write ownership, and the narrow standalone cursor-visibility control grammar. Comparison producers explicitly carry null frame evidence; old or missing bare evidence is not interpreted as zero.
- Stable render/paint work and fullscreen-clear accounting now use each actual frame's own cause and geometry. Raw checkpoint deltas and terminal writes remain available. A real dock render remains a failure even with no write or a later non-input frame.
- A bounded first-failure diagnostic names workload, producer, checkpoint, frame/cause/revision, expected/actual counters, viewport, and write indexes. Tests verify it does not expose terminal content or require recapture.
- Controlled real-shell stream-first/input-first tests verify identical terminal bytes, render counts, checkpoint semantic results, input revisions, and scheduled delays with observation enabled/disabled. The stream-first test reproduces a real mixed checkpoint with positive transcript renders and final `dock-input` cause, but zero work in the dock frame itself. This proves the false-positive mechanism, not the unidentified historical workload.
- Windows Node **24.16.0** and **22.23.2**: **57 tests passed each** across `input-frame-work`, `input-frame-observation`, `input-producer`, `input-responsiveness-budgets`, `input-responsiveness-smoke`, `input-budgets`, and `input-evidence` test files. The existing real full input gate retains six workloads, three independent producer launches, and zero deliberate repeat captures.
- Typecheck, build, full code-documentation governance, and architecture/provenance checks passed locally. Strict OpenSpec and whitespace validation also passed before push. No local repository-wide full suite or interactive UI automation was run.

No changes were made to production source, budgets, workload definitions, cadence, settling sleeps, timeouts, retry policy, dependencies, source ledger, rendered baselines, or workflows.

## Review handoff

Exact worktree: `D:/Git/a1/.worktrees/fix-input-stable-transcript-renders`; branch `fix/input-stable-transcript-renders`; use the implementation head reported in PR #398, not its planning commit. The changed behavior is evidence accounting and failure reporting, not a user-interface change.

Focused deterministic accounting, malformed-evidence, negative-budget, and real-shell observation controls:

```sh
cd D:/Git/a1/.worktrees/fix-input-stable-transcript-renders && npx vitest run test/integrations/pi/tui-runtime/input-frame-work.test.ts test/integrations/pi/tui-runtime/input-frame-observation.test.ts
```

The existing full input gate (a focused test file, not the repository full suite):

```sh
cd D:/Git/a1/.worktrees/fix-input-stable-transcript-renders && npx vitest run test/integrations/pi/tui-runtime/input-responsiveness-budgets.test.ts
```

For physical comparison of unchanged typing, rapid menu navigation, resize, and input during streaming, build before each color-preserving launch:

```sh
cd D:/Git/a1/.worktrees/fix-input-stable-transcript-renders && npm run build && ./scripts/dev
cd D:/Git/a1/.worktrees/fix-input-stable-transcript-renders && npm run build && ./scripts/dev pi
```

Expect no delayed input, stale menu selection, or changed terminal output. The passing diagnostic-control tests are not an actual maintainer terminal review, nor approval to merge. Final-head acceptance and the reviewed canonical-spec baseline remain to be recorded from real review.

## Native validation and separate obligations

Current-head implementation CI and four-native-lane Full regression are pending. #390 is a separate unmerged trust candidate, so a standalone full run on this develop-based stream may fail its known macOS trust gate before reaching input responsiveness. Obtain explicit authorization for a temporary combined-candidate validation stream instead of importing trust code into this PR or claiming a blocked run green.

The trust PR and original nightly/scoped-model changes retain their own integration and acceptance requirements. After integration, their newly numbered merged-package validation still needs source, version, digest, and all four full-nightly-equivalent lane outcomes. This source-level correction does not satisfy those package obligations or authorize published-byte changes. Auto-merge remains disabled; no manual acceptance, merge, or archival is claimed.

## Context

See `proposal.md` for motivation and scope. Timing ownership is ambiguous enough to require a design before implementation.

### Evidence and attribution limits

- PR #373, head `31fc1a45`, failed fast validation in run [34848254433](https://github.com/timurproko/a1/actions/runs/34848254433/job/103989846402): `pi-event-frame-parity.test.ts` expected one hash and observed two; 2,647 other tests passed. Rendering validation separately passed.
- The isolated three-test parity file passed locally. An exploratory loop of 1,500 captures without injected pressure produced one hash.
- A separate exploratory probe scheduling approximately 100 ms of event-loop blockage every 5 ms produced two hashes by the third capture. The first differing `completed` frame shared `ESC[1G ESC[?25l`; one capture ended there while the other continued with cursor movement, a row clear, and a bordered-row repaint. This demonstrates a capture-timing sensitivity, not a color-depth diagnosis or a complete identification of the responsible callback.
- At the original proposal base `421ceb50`, fixture and parity-test source matched the selection stream's base. The fixture uses the pinned layout, not the custom selection viewport. This historical observation does not claim that the current baseline still reproduces the unfixed failure.
- PR #374 merged as `43a9598279d13336fee8cb61fd81ec62bcb915bd`. Its [recorded evidence](../fix-nightly-platform-validation/evidence.md) identifies a completed redraw lost when cursor housekeeping was mistaken for a completed paint. It supplies fixed-clock capture, normal/delayed repetitions, success/interruption restoration checks, strict first-difference diagnostics, and idempotent generation under both ambient modes without a baseline change.
- At reconciliation base `5a416891`, the fixture, parity tests, diagnostics, and generator are unchanged from #374. The current fixture still uses `physical.writes.length` to decide whether to render; its Node mock clock is process-global. There is no explicit settlement bound. Delays before events do not demonstrate controlled callback ordering around flushing/resize, and disposal-failure/unrelated-timer isolation remain unverified.
- PR #373's accepted head `09a2c0e6` passed required CI in run [34851129829](https://github.com/timurproko/a1/actions/runs/34851129829), merged as `5cfe7884`, and was archived by #384. Its acceptance does not complete this tooling plan. The pressure probe later timed out on the fixed baseline; that is not a continued hash reproduction.
- Retain the historical evidence and reproduce the responsible callback ordering with bounded tests against the vulnerable behavior. Separately demonstrate which stronger requirements fail on the current baseline; do not require a flaky historical hash to recur before testing an explicit remaining gap.

## Goals / Non-Goals

**Goals:**
- Assign every retained stage a known event-settlement and render boundary, including initial presentation, streaming, tool completion, agent completion, and resize.
- Keep repeated captures identical under opposing ambient capabilities and deliberately perturbed scheduling, while preserving useful evidence of real presentation changes.
- Make the existing standalone generator and Vitest assertions use the same producer and timing policy.

**Non-Goals:**
- Altering production scheduler cadence, terminal adapters, pinned packages, or right-edge selection behavior.
- Skipping the failing test, accepting multiple hashes, retrying until a pass, increasing timeouts, serializing unrelated suites, or changing CI color/environment defaults.
- Treating A1-generated diagnostic fixtures as independent evidence of pinned equivalence.

## Decisions

### 1. Own time and stage boundaries in test tooling

Reuse the merged fixture's deterministic-time approach, replacing process-global ownership with a fixture-owned deterministic timing scope for the callbacks responsible for evidence scheduling. Drive event settlement, scheduled presentation, and maintenance work in a declared order at each scripted boundary instead of relying on elapsed wall time or `writes.length` as a completion signal. Prefer existing supported runtime controls and test-owned clock/scheduler support. The support must also work from the standalone generator, not depend on Vitest being present at execution time.

Trace and reproduce the responsible callbacks first. Keep the actual engine adapter, shell rendering, and terminal write capture in the fixture; do not replace them with expected rows. If deterministic control requires production API changes, new dependencies, or private/prototype patches, stop and request a scope revision rather than expanding this test-only repair.

A longer sleep or a large synchronous CPU burn is unsuitable as the permanent solution: it makes correctness depend on host speed. An unconditional extra render alone is also insufficient unless evidence proves that pending callbacks cannot paint across the chosen boundary.

### 2. Separate maintenance at the scheduling boundary, not by filtering ANSI

The fixture may explicitly settle or exclude known maintenance-only work before opening a stage capture window. It must not discard output merely because it contains a cursor sequence, duplicates a row, or differs from the golden file. Every event-driven write assigned to a retained window remains in its original order. Assert semantic state and geometry at the same boundary so a missing or late render cannot masquerade as a stable hash.

Retain existing declared portability normalization only. Do not strip SGR, broaden cursor/clear normalization, collapse multiple writes into synthesized row snapshots, or otherwise erase the repaint variation after capture.

### 3. Bound capture and restore all fixture-owned state

The timing scope must restore prior clock/timer behavior and terminal-capability state on success, rejection, and disposal failure. Dispose the shell and adapter and cancel only fixture-owned pending work before leaving the scope. No callback from one capture may write into a subsequent capture. Do not globally flush unrelated timers or leave the test worker with a frozen clock.

Declare a finite settlement bound and fail with the current stage and pending-work diagnostics if it is exceeded. An unbounded drain-until-idle loop is invalid because periodic animation or maintenance may never become idle.

### 4. Test the race deliberately and retain strict failure signals

Add bounded adversarial schedules that permit due maintenance/presentation callbacks on either side of event flushing and completion/resize capture boundaries. The regression must demonstrate the old implementation's mismatch and the corrected implementation's identical structured states, normalized captured ANSI, geometry, and final hash. Keep the existing 12 repetitions across both ambient color modes; test both ordinary and perturbed scheduling.

Retain #374's stage and first-difference diagnostics with bounded escaped context (the existing helper reports a serialized offset), rather than only the number of unique hashes. Verify with a deliberate semantic or terminal-control difference that the comparison still fails; determinism must not come from ignoring evidence.

Exercise sequential and failing captures, capability restoration, and generator idempotence. Long CPU-pressure loops remain optional diagnostics, not a new CI workload or timeout allowance.

### 5. Preserve diagnostic provenance and isolate integration

Aim to preserve existing fixture payloads. If explicit boundaries expose an incorrectly captured retained stage, explain every affected stage and byte-level change and obtain review before regenerating it. Do not relabel an A1-generated fixture as independent parity evidence or rewrite source provenance to imply otherwise.

This is independent of `make-parity-color-depth-deterministic`: reuse its declared capability scope without changing its color contract or reopening its release tasks. Use #379's legacy merged-plan implementation route for the remaining work, not the already-merged #373. Require CI and acceptance for the new tooling candidate; neither #374's evidence nor #373's acceptance substitutes for those gates.

## Risks / Trade-offs

- [Synthetic scheduling misses the real race] → Identify the callback sequence and encode both observed interleavings; retain real rendering and bounded raw-write diagnostics.
- [Timer control leaks into other tests or generator execution] → Scope ownership, restore in `finally`, and test failure and consecutive captures.
- [Stable bytes hide missing event paint] → Check settled semantic state and geometry at the capture boundary and retain negative comparison coverage.
- [A golden refresh conceals a regression] → Preserve payloads by default; explain and review any capture-boundary correction separately from the determinism assertion.
- [Investigation reveals a production defect rather than a fixture defect] → Pause for scope approval; do not force the result into this test-only plan.

## Migration Plan

Planning PR #379 is already merged. After the explicit implementation request, fetch current `origin/develop` and use an isolated legacy implementation stream with version-1 linkage to #379. Reconcile the approved artifacts before code edits, reuse #374, and implement only the outstanding test-tooling obligations. Retain any existing implementation PR rather than duplicating it. Obtain focused evidence, required CI, exact-candidate maintainer acceptance, and explicit manual merge authorization; keep code auto-merge disabled.

PR #373's required validation, acceptance, integration, and archival are historical completed work, not a new dependency. Archive this tooling change only with its own acceptance record and completed substantive tasks; keep evidence recording and archive staging separate from manual review. There are no delta specs to synchronize. Clean retained worktrees only after verified archive integration and cleanliness checks.

There is no user-data or runtime migration. Rollback of the remaining hardening reverts only its test-tooling changes and retains #374's existing repair; reverting #374 itself would reintroduce the historical flaky validation risk.

## Context

See `proposal.md` for motivation and scope. Timing ownership is ambiguous enough to require a design before implementation.

### Evidence and attribution limits

- PR #373, head `31fc1a45`, failed fast validation in run [34848254433](https://github.com/timurproko/a1/actions/runs/34848254433/job/103989846402): `pi-event-frame-parity.test.ts` expected one hash and observed two; 2,647 other tests passed. Rendering validation separately passed.
- The isolated three-test parity file passed locally. An exploratory loop of 1,500 captures without injected pressure produced one hash.
- A separate exploratory probe scheduling approximately 100 ms of event-loop blockage every 5 ms produced two hashes by the third capture. The first differing `completed` frame shared `ESC[1G ESC[?25l`; one capture ended there while the other continued with cursor movement, a row clear, and a bordered-row repaint. This demonstrates a capture-timing sensitivity, not a color-depth diagnosis or a complete identification of the responsible callback.
- The fixture and parity-test source are unchanged between the selection stream's base and this proposal's `origin/develop` base, `421ceb50`. The fixture constructs the default pinned-layout shell, not the custom selection viewport. A pressure reproduction against the fresh implementation baseline is still required before claiming definitive change attribution.
- Current capture code discards a maintenance render before emitting an event, awaits `adapter.flushEvents()`, then uses whether any terminal write arrived to decide whether to render. A terminal write is not proof that the current semantic event has reached its intended presentation boundary.

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

Introduce a fixture-owned deterministic timing scope for the callbacks responsible for evidence scheduling. Drive event settlement, scheduled presentation, and maintenance work in a declared order at each scripted boundary instead of relying on elapsed wall time or `writes.length` as a completion signal. Prefer existing supported runtime controls and test-owned clock/scheduler support. The support must also work from the standalone generator, not depend on Vitest being present at execution time.

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

On failure, report the stage and first differing byte with bounded escaped context, rather than only the number of unique hashes. Verify with a deliberate semantic or terminal-control difference that the comparison still fails; determinism must not come from ignoring evidence.

Exercise sequential and failing captures, capability restoration, and generator idempotence. Long CPU-pressure loops remain optional diagnostics, not a new CI workload or timeout allowance.

### 5. Preserve diagnostic provenance and isolate integration

Aim to preserve existing fixture payloads. If explicit boundaries expose an incorrectly captured retained stage, explain every affected stage and byte-level change and obtain review before regenerating it. Do not relabel an A1-generated fixture as independent parity evidence or rewrite source provenance to imply otherwise.

This is independent of `make-parity-color-depth-deterministic`: reuse its declared capability scope without changing its color contract or reopening its release tasks. Keep this repair in a fresh implementation PR rather than adding unrelated test infrastructure changes to #373. After authorized integration, #373 needs required CI on its actual current candidate; a passing isolated test or a rerun of an older head is not acceptance.

## Risks / Trade-offs

- [Synthetic scheduling misses the real race] → Identify the callback sequence and encode both observed interleavings; retain real rendering and bounded raw-write diagnostics.
- [Timer control leaks into other tests or generator execution] → Scope ownership, restore in `finally`, and test failure and consecutive captures.
- [Stable bytes hide missing event paint] → Check settled semantic state and geometry at the capture boundary and retain negative comparison coverage.
- [A golden refresh conceals a regression] → Preserve payloads by default; explain and review any capture-boundary correction separately from the determinism assertion.
- [Investigation reveals a production defect rather than a fixture defect] → Pause for scope approval; do not force the result into this test-only plan.

## Migration Plan

Merge the planning PR first. After a new implementation request, use a fresh detached worktree from current `origin/develop`, reproduce the baseline race, implement the test-only timing boundary, and obtain focused evidence plus required CI. Hand off the exact candidate with its focused test/generator commands for maintainer acceptance; leave code auto-merge disabled. After explicit authorization and integration, validate the selection candidate separately and archive this tooling change with its acceptance record.

There is no user-data or runtime migration. Rollback reverts only the test tooling and any reviewed diagnostic changes; it restores the known flaky validation risk and is not proof that blocked code is valid.

## Context

See `proposal.md` for motivation. Investigation read the failed logs and current source at `ffdf7b92465a5e4e19bc6621d4b496c2d8197f3e`; no local test suite or reproduction has been run during planning.

### Observed evidence

| Lane / job | Failure | What the evidence establishes |
| --- | --- | --- |
| macOS Node 24 / `103917595348` | `prompt-input-ux.test.ts`: expected header to contain `alt+m`, received `option+m` | The test hardcodes a non-macOS label after applying a live binding override. |
| Windows Node 22 / `103917595423` | `dependency-certification.test.ts`: independent abandoned-lease publishers fail with `EPERM` | The child stack reaches `dependency-certification.ts:144`, renaming the active lock directory to its token-specific released path, not the canonical certification publication rename. |
| Windows Node 22 / same job | `pi-event-frame-parity.test.ts`: expected one hash, received two | At least two structured captures differed over 12 repetitions of each ambient color mode. The log contains neither the differing captures nor their first divergent stage. |
| Linux Node 24 and Windows Node 24 | Passed | No evidence supports removing Node 22, downgrading Node 24, or claiming a universal production rendering bug. |

The run downloaded the existing immutable `.368` package. Building guardians and packing source were intentionally skipped for that existing version. `Publication result` failed because validation failed; it is not an independent publication defect.

The certification implementation already uses a nonempty directory lease with PID/token ownership, a five-second acquisition deadline, and retained abandoned-generation tombstones. The returned release callback performs an unguarded rename followed by recursive removal. Acquisition and reclamation tolerate several contention codes, but release does not.

The frame producer already scopes truecolor and hyperlinks, initializes the theme, discards prior maintenance renders, flushes adapter events, and explicitly renders checkpoints. However, it instantiates a live shell and does not explicitly supply its available stream scheduler. Its hash assertion discards the structured results and therefore cannot explain whether the remaining variation is timing, dynamic data, capabilities, or a real output regression. A scheduling cause is a hypothesis, not a confirmed diagnosis.

## Goals / Non-Goals

**Goals:**

- Correct the proven assertion mismatch without changing user-visible shortcut conventions.
- Keep publication serialization safe while absorbing short-lived release-path sharing errors inside the owning operation.
- Obtain a reproducible first divergence before selecting the smallest deterministic frame-harness correction.
- Preserve sealed evidence, independent parity authority, and the unchanged four-lane release gate.

**Non-Goals:**

- No general filesystem retry abstraction, dependency upgrade, lease-format migration, runtime rendering redesign, or global suite serialization.
- No Windows Defender disablement, matrix exclusion, timeout inflation, automatic test retries, or acceptance of multiple hashes.
- No product color-mode override, broad ANSI filtering, stage removal, or baseline regeneration to accept unexplained output.
- No claim that a planning PR or rerun of old `.368` validates changed runtime bytes.

## Decisions

### 1. Assert presentation independently from binding identity

Keep the runtime configured key `alt+m`. Change the failing help assertion to require `option+m` on Darwin and `alt+m` elsewhere, with an independent expected label rather than calling the same production formatter to generate the oracle. Retain the before/after live override assertions, unbound `/model` fallback, thinking binding, and pinned profile checks. If an existing label helper exposes a platform seam, exercise both branches directly; do not introduce a production seam solely for this one assertion. Native macOS and Windows/Linux CI remain required evidence.

Changing runtime output to always say Alt was rejected because it would break correct platform presentation to satisfy a test assumption. Accepting either string on every host would weaken coverage.

### 2. Retry release operations, not certification transactions

Keep the established lease protocol and abandoned-generation tombstones. Add a narrow release path that:

- Uses the acquired PID/token identity and validates the managed non-link lease/owner before an active-path rename, including after contention delays.
- Atomically retires the owned active path to its unique released path once, then retries cleanup only on that private path. A successor may acquire the active path after retirement; cleanup must never return to that path.
- Retries only explicitly classified transient release errors, initially `EPERM`, `EACCES`, and `EBUSY`, under a shared one-second release deadline with short capped backoff. Permanent access denial is bounded by the same deadline, not silently classified as success. Acquisition retains its existing budget.
- Treats an absent active path as success only when retirement by this release operation is established; a missing or replaced unretired lease is an ownership error, not permission to remove arbitrary state.
- Preserves diagnostics for both publication and release if both fail, rather than replacing the original failure with cleanup noise.

A single release budget covers retirement and private cleanup, preventing stacked unbounded retries. Tests use a controlled clock or narrow operation mocks instead of waiting through real deadlines. The precise backoff steps are an implementation detail within the fixed budget.

The log proves an `EPERM` at retirement, but not which process or antivirus component held a handle. Accordingly, testing must inject transient failures deterministically and retain real concurrent-process coverage. Retrying the whole certification transaction was rejected: the valid record may already be published, and rewriting it can invalidate restart seals. Deleting the active lock recursively was rejected because delayed cleanup could destroy successor ownership. Ignoring release errors was rejected because it would report success while leaving a live-process lease blocking future publishers.

### 3. Make frame evidence explain itself before changing its timing

Retain structured captures alongside their hashes. On the first mismatch report repetition, ambient mode, differing state/frame stage, first differing offset or field, and a bounded escaped context window. Use synthetic fixture content only; diagnostics need no user state or credentials. Keep the hash cardinality assertion strict and preserve the baseline's diagnostic-only authority.

Repeat the focused workload under controlled delayed scheduling as well as its normal capture sequence. Trace the first difference to its producing input or render boundary. Then control that input in the fixture producer: use existing scheduler injection and deterministic advancement for demonstrated scheduler variation, or explicitly fix the demonstrated dynamic value at the test boundary. Enter capability/theme setup before constructing producers and dispose resources before restoring any scoped test state. If fake time is needed, apply it narrowly with guaranteed restoration and explicit asynchronous queue advancement; freezing time globally across the suite is not acceptable.

Keep event states and normalized semantic frame bytes unchanged for the intended workload. Existing portability normalization remains the only allowed normalization. Keep at least the current 12 repetitions across both ambient modes. Add a delayed-execution regression and negative tests proving an SGR or cursor/clear mutation still fails with useful diagnostics. Confirm fixture generation is byte-idempotent without committing changed rendered baselines.

This is an evidence-first implementation task, not a claim that the color helper is broken. If diagnosis demonstrates a production rendering or theme behavior change is necessary, pause and revise this plan before widening implementation scope; do not silently replace the planned test-harness correction with a runtime redesign.

### 4. Validate current source and the final immutable artifact separately

The implementation PR must pass its required development gate with changed regressions selected. Obtain focused repeated evidence for macOS Node 24, Linux Node 24, and Windows Node 22/24. Windows evidence retains Defender and independent publishers; deterministic injection alone cannot model every real sharing behavior.

After explicit maintainer acceptance and manual code merge, require a newly numbered package from the merged implementation source to pass full nightly-equivalent validation on all four lanes against the same digest. Normal preview success is not sufficient to close a full-nightly failure. Do not republish or mutate `.368`. A skipped guardian build remains acceptable only when the existing immutable-package plan calls for reuse.

## Risks / Trade-offs

- **Ownership checks race with another generation** → Retain atomic nonempty-directory arbitration, token checks, and abandoned-generation tombstones; regression-test delayed release/reclamation after a successor acquires the active path.
- **Bounded retries hide a persistent filesystem defect** → Retry only classified operations, fail at the shared deadline, and report phase/code/ownership context without swallowing publication errors.
- **Real-process contention is difficult to reproduce locally** → Combine deterministic fault injection with repeated native Windows CI coverage; do not attribute it exclusively to Node 22.
- **Controlled scheduling hides real rendering failures** → Control only diagnostic workload inputs, retain real scheduler tests and independent pinned parity, and require negative semantic/control-sequence mutations to fail.
- **Frame variation remains unexplained** → Keep the task incomplete and preserve useful diagnostics; do not bless a new fixture or describe the nightly as repaired.

## Migration Plan

1. Merge this strictly validated OpenSpec-only proposal.
2. On a subsequent explicit implementation request, fetch current `origin/develop` and create a new detached implementation worktree/history and code PR citing this change.
3. Implement the platform assertion, ownership-safe bounded release handling, and evidence-led deterministic capture correction with their regression tests.
4. Pass required CI, report native repeated evidence, and obtain manual acceptance. Keep auto-merge disabled for the code PR.
5. After explicit manual merge authorization, validate the new exact numbered package with full nightly-equivalent scope and record the run, source, version, digest, and all lane outcomes.
6. Archive only after accepted implementation and evidence are recorded. No persisted-data migration is required. Rollback reverts this change in a new commit/version; it must not alter existing package bytes or discard retained certification records.

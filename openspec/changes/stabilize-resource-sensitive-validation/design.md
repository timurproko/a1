## Context

See `proposal.md` for motivation. The current `fast` tier is one Vitest remainder invocation with file parallelism and the default five-second per-test timeout. Several tests create temporary Git repositories, scan tracked files, mutate stores, or launch release-cohort processes. They therefore compete with every other fast test for process and filesystem capacity.

The failure is recurring rather than hypothetical:

- Release run `33617331350` timed out `cohort-state.test.ts` and two `update-live-cohort.test.ts` cases on Windows Node 24.
- Pull-request run `33642848728` timed out `code-documentation.test.ts` and `storage.test.ts` while the fast remainder was under contention. Its independent event-frame nondeterminism was repaired separately and is not part of this change.
- Release run `33657859943` packed `0.1.8-dev.214` and passed Linux Node 24, macOS Node 24, and Windows Node 22, but Windows Node 24 timed out the final case in `validation-impact.test.ts`. That file took 19.4 seconds under contention while the same file completed in 6.2 seconds and the same case in 1.0 second on Windows Node 22.

Publication must continue to validate one exact packed artifact, fail on real defects, and avoid manual or automatic repacking. The existing validation-tier planner is already the shared authority used by pull-request and exact-package validation.

## Goals / Non-Goals

**Goals:**

- Remove known process/filesystem contention from the parallel fast remainder.
- Preserve one authoritative fast tier and exactly-once test ownership.
- Retain the existing five-second fast-test timeout for both partitions.
- Make partition selection, fixture/subprocess phases, and timing visible in plans, outcomes, and regression evidence.
- Optimize test setup or child-process work if serialization alone does not restore margin under the existing timeout.

**Non-Goals:**

- Retrying failed assertions, nondeterministic parity, or complete workflow jobs.
- Making CI or GitHub infrastructure incapable of failing.
- Increasing any test, suite, platform, or workflow timeout, including a partition-only timeout.
- Changing exact package construction, platform coverage, publication conditions, npm authentication, tags, or runtime behavior.

## Decisions

### 1. Add a reviewed resource-sensitive partition to the fast-tier declaration

The validation suite configuration will list fast tests that repeatedly exercise subprocess or filesystem lifecycle. The initial set will cover the files implicated by the three recorded runs:

- `test/repository-governance/validation-impact.test.ts`
- `test/repository-governance/code-documentation.test.ts`
- `test/foundation/storage/storage.test.ts`
- `test/foundation/release/cohort-state.test.ts`
- `test/foundation/release/update-live-cohort.test.ts`

The planner will treat these paths as owned by the fast tier but subtract them from its remainder invocation. It will reject missing files, overlap with another explicit scope, duplicate declarations, or a partition path that is not otherwise part of the fast test universe.

Alternative: infer classification by source inspection or filename. Rejected because subprocess and filesystem cost is behavioral, indirect helpers are common, and implicit classification would be difficult to audit.

### 2. Execute the partition once while retaining the existing timeout

The planner will emit a distinct `vitest-fast-resource-sensitive` invocation using the exact declared paths and no file parallelism. It will not pass a larger `--testTimeout`; the repository's existing five-second fast-test timeout remains authoritative. Tests within each file remain non-concurrent under the repository Vitest configuration.

The ordinary `vitest-fast` invocation retains file parallelism and the same timeout. The dedicated invocation runs on every platform, not only Windows, so plan semantics do not depend on the host and cross-platform evidence stays comparable.

The implementation will run the partition repeatedly in focused validation and expose available fixture/subprocess phase timing. If a test remains close to or beyond five seconds without file contention, its repository setup, subprocess count, storage operations, or release fixture will be optimized while preserving hermetic state and assertions. A larger timeout is not an acceptance path for this change.

Alternative: give only the partition a 30-second timeout. Rejected because it still treats resource contention as permission for slower tests and delays detection of genuine hangs. Alternative: set the complete fast tier to `--testTimeout=30000`. Rejected because it masks hangs in hundreds of ordinary tests without reducing contention. Alternative: run the complete fast tier without file parallelism. Rejected because it discards safe concurrency and unnecessarily lengthens every validation lane.

### 3. Do not retry test or workflow failures

A nonzero exit from either fast invocation ends the tier unsuccessfully. The runner will not parse logs to decide whether a failure looks transient and will not rerun a failed test. This preserves fail-closed semantics and avoids blessing a nondeterministic assertion simply because a second attempt differs.

Alternative: automatically rerun failed jobs or failed tests once. Rejected because generic retries cannot reliably distinguish resource contention from semantic nondeterminism, can duplicate expensive work, and obscure the first failure.

### 4. Prove ownership and execution structure at the planner boundary

Focused planner tests will assert command identifiers, exact exclusions, no-file-parallelism, unchanged timeout arguments, test disjointness, and the absence of retry behavior. A focused execution regression will exercise the resource-sensitive partition repeatedly under the existing timeout and record structured file, fixture, and subprocess timing where available. Repository governance will ensure future partition edits cannot omit, duplicate, silently return a test to contention, or introduce a larger timeout.

No release-workflow condition needs to change: both pull-request and exact-package jobs already invoke the shared tier planner. This correction therefore reaches `npm run develop` without adding a second publication authority.

## Risks / Trade-offs

- **[Risk] The dedicated partition increases fast-tier wall-clock time.** → Only five known resource-sensitive files are serialized; the much larger ordinary remainder stays parallel, and per-invocation durations remain visible.
- **[Risk] A newly added resource-heavy test is initially left in the remainder.** → Document classification criteria and require explicit governance coverage when recurring contention evidence adds a path.
- **[Risk] A test may still exceed five seconds after file-level serialization.** → Measure setup and subprocess phases, optimize the fixture or child-process workload, and reject timeout growth as the shortcut.
- **[Risk] Tests in one partition can still contend internally.** → Repository Vitest sequencing remains non-concurrent, and any repeated timeout after isolation is treated as a real workload or implementation issue rather than retried.

## Migration Plan

1. Extend validation-suite parsing and planning with the declared resource-sensitive fast partition and invariants.
2. Add the initial evidence-backed file list, focused planner/governance coverage, and phase-timing diagnostics without changing timeout configuration.
3. Run the partition repeatedly under the existing five-second timeout, optimize any test without sufficient margin, then run typecheck, architecture, documentation governance, and strict OpenSpec validation; rely on CI for ordinary and exact-package suites.
4. After merge, run `npm run develop` once from authoritative `develop`; require the new exact package to pass all platform lanes and publish without a manual rerun.

Rollback removes the partition declaration and planner support together. No package, registry, or user-state migration is required.

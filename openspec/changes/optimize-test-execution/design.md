## Context

The original seven-stage plan targeted duplicate work without changing pull-request coverage. It delivered useful fixture and capture consolidation, but the finalized candidate still retains 502 files and a validation-authority change selects all coarse owners and every pull-request integration owner. Exact-head run 40123697042 scheduled 24 modular jobs and continued expensive work after the core lane failed. The approved refinement changes the pull-request contract itself: critical affected behavior remains required, while exhaustive permutations move to Full, nightly, and release cadence.

## Goals / Non-Goals

Goals: reproducible cost inventory; once-per-gate rendering captures; critical pull-request selection; direct-impact integration scheduling; cheaper independent fixtures; receipt-bound package preparation; early cancellation; auditable deferred coverage.

Non-goals: weakening Full/nightly/release coverage, sharing mutable installed/repository state between scenarios or shards, caching successful outcomes, changing startup measurements or protection, raising deadlines, retries, bypassing required CI, forcing PR Full regression, or modifying runtime product behavior.

## Decisions

1. Baseline reporting consumes existing logs/outcomes and current test/suite inventory; timing is observational, never validation authority. Distinguish queue, setup, work, critical path, runner sum, and unavailable observations.
2. Select only the active isolated rendering scope in tier planning. Move smoke-only assertions into shared assertions evaluated from the existing full captures. Scheduled-content assertions execute once per gate; no whole-file exclusion may lose unique assertions.
3. Preserve coarse owners and add bounded reviewed refinements for known subareas. Uncovered paths, deleted/renamed identities, unavailable dependency information, invalidators, manual dispatch, and unsupported inputs retain coarse/conservative coverage. Changed tests and known support consumers cannot disappear through refinement.
4. Optimize immutable fixture inputs and batch only independent subprocess scenarios. Keep fresh mutable roots, real race/lock/Git checks, controlled environments, and failure-safe cleanup. Source and emitted-entry checks are distinct coverage, not duplicates.
5. Audit every retained test by ownership and execution class; removal/consolidation needs a documented equivalent retained check. Retain uncertain overlap rather than guess.
6. Profile exact-package phases and eliminate redundant verification/preparation only within the existing lane receipt/identity contract. Fresh prefixes, independent shards, pre/post consumer checks, three predecessors, direct/bridged updates, first-attempt startup, and Defender remain unchanged.
7. Tests enforce once-only assignment, refinement fallback, retained consumers, and unchanged failure authority. Documentation records structural savings separately from unmeasured hosted elapsed improvement.
8. Every coarse owner declares a small explicit critical floor. Impact selection adds changed test files and statically reachable consumers instead of the owner's complete test population. Unknown inputs and validation invalidators retain all critical floors, not every retained test.
9. Integration cadence distinguishes ordinary pull-request boundaries, direct-impact expensive boundaries, and exhaustive owners. Direct-impact owners run only when their declared tests, support, or production surfaces change; conservative fallback does not schedule them.
10. Rendering smoke/full classification is based on rendering surfaces, not generic validation-authority files. Full/nightly/release still execute exhaustive rendering matrices.
11. The Development matrix cancels remaining entries after a failure. Selection contracts enforce bounded files and scheduled jobs so future policy growth cannot silently restore whole-repository pull-request execution.

## Delivery and Validation

One planning-only draft PR precedes implementation on test/optimize-test-execution. User approval and implementation authorization were already explicit before these artifacts were authored. Implementation outcomes are checked immediately after code, tests, and detailed task bookkeeping are written. Before the final marker, finish all pre-ready tasks and gap dispositions, add plain Acceptance, reconcile and push current develop, and check the delivery body. Trusted automation owns readiness/finalization and exact-head CI. Local checks are typecheck and explicit touched tests only; broad local suites are not authorized by this plan. Hosted timing comparison is reported from available completed evidence, not by waiting for CI or claiming unexecuted results.

## Risks

Critical selection can miss dynamically reached consumers; explicit critical floors, changed tests, bounded static consumers, direct-impact integration declarations, and exhaustive cadence provide layered authority. Process batching can leak module state; only case-isolated commands qualify. Fixture seeding can shift work outside deadlines; retain per-scenario accounting and immutable inputs only. Reduced pull-request coverage does not reduce Full/nightly/release coverage. The old CI baseline cannot establish new-head performance.

## Known Gaps

None. Observational timing limits, deliberately retained uncertain overlap, widened UI consumer coverage, and irreducible npm/predecessor preparation costs are explicitly dispositioned in implementation-evidence.md rather than claimed as measured hosted improvements.

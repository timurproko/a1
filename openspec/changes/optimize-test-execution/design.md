## Context

The approved seven-stage plan targets duplicate work, not weaker tests. Initial analysis covered 489 test files at 8791e02d and Full regression run 39708423610: rendering smoke/full overlap cost about 67 seconds per Windows rendering lane; the predecessor lane remained the critical path. Implementation starts at current origin/develop 14caed95, so inventory and baseline evidence must identify source drift rather than claim those older durations describe the new head.

## Goals / Non-Goals

Goals: reproducible cost inventory; once-per-gate rendering captures; proportionate reviewed PR subareas; cheaper independent fixtures; explicit retained-coverage mapping; receipt-bound package preparation; auditable orchestration.

Non-goals: deleting unique assertions, reducing predecessor count, sharing mutable installed/repository state between scenarios or shards, caching successful outcomes, changing startup measurements or protection, raising deadlines, retries, bypassing required CI, forcing PR Full regression, or modifying runtime product behavior.

## Decisions

1. Baseline reporting consumes existing logs/outcomes and current test/suite inventory; timing is observational, never validation authority. Distinguish queue, setup, work, critical path, runner sum, and unavailable observations.
2. Select only the active isolated rendering scope in tier planning. Move smoke-only assertions into shared assertions evaluated from the existing full captures. Scheduled-content assertions execute once per gate; no whole-file exclusion may lose unique assertions.
3. Preserve coarse owners and add bounded reviewed refinements for known subareas. Uncovered paths, deleted/renamed identities, unavailable dependency information, invalidators, manual dispatch, and unsupported inputs retain coarse/conservative coverage. Changed tests and known support consumers cannot disappear through refinement.
4. Optimize immutable fixture inputs and batch only independent subprocess scenarios. Keep fresh mutable roots, real race/lock/Git checks, controlled environments, and failure-safe cleanup. Source and emitted-entry checks are distinct coverage, not duplicates.
5. Audit every retained test by ownership and execution class; removal/consolidation needs a documented equivalent retained check. Retain uncertain overlap rather than guess.
6. Profile exact-package phases and eliminate redundant verification/preparation only within the existing lane receipt/identity contract. Fresh prefixes, independent shards, pre/post consumer checks, three predecessors, direct/bridged updates, first-attempt startup, and Defender remain unchanged.
7. Tests enforce once-only assignment, refinement fallback, retained consumers, and unchanged failure authority. Documentation records structural savings separately from unmeasured hosted elapsed improvement.

## Delivery and Validation

One planning-only draft PR precedes implementation on test/optimize-test-execution. User approval and implementation authorization were already explicit before these artifacts were authored. Implementation outcomes are checked immediately after code, tests, and detailed task bookkeeping are written. Before the final marker, finish all pre-ready tasks and gap dispositions, add plain Acceptance, reconcile and push current develop, and check the delivery body. Trusted automation owns readiness/finalization and exact-head CI. Local checks are typecheck and explicit touched tests only; broad local suites are not authorized by this plan. Hosted timing comparison is reported from available completed evidence, not by waiting for CI or claiming unexecuted results.

## Risks

Selection narrowing can miss transitive consumers; explicit reviewed dependencies and conservative fallback take priority over savings. Process batching can leak module state; only case-isolated commands qualify. Fixture seeding can shift work outside deadlines; retain per-scenario accounting and immutable inputs only. Reduced rendering file counts do not imply reduced assertions. The old CI baseline cannot establish new-head performance.

## Known Gaps

None. Observational timing limits, deliberately retained uncertain overlap, widened UI consumer coverage, and irreducible npm/predecessor preparation costs are explicitly dispositioned in implementation-evidence.md rather than claimed as measured hosted improvements.

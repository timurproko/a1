## Context

See `proposal.md` for motivation. The current Development workflow always runs the complete fast remainder and resource-sensitive partition for code PRs, then conditionally fans out up to seven integration job groups. Its selector uses a base/head source dependency graph plus invalidators, and its stable aggregate requires every modular outcome to carry the current `runAttempt`. A failed-jobs-only rerun therefore cannot combine unchanged successful jobs from the earlier attempt with the repaired job.

The recently accepted validation optimization recorded a conservative Development run of roughly 2.1 million runner-ms with a critical path above ten minutes, while its ordinary fast job remained above the intended two-to-three-minute range. PR #425 then exposed five non-product failures from historical evidence paths and exact guidance prose, followed by an unchanged package-surface setup timeout after other Pi/release tests had passed. The system is fail closed, but it spends substantial time and maintenance effort proving bookkeeping that is not always relevant to the changed behavior.

The protected branch still needs one stable required check. Exact package bytes, first-attempt startup, release transitions, publication, and supported-platform contracts remain high-authority boundaries and cannot be inferred from unit tests or prior heads.

## Goals / Non-Goals

**Goals:**
- Make the normal code-PR critical path a bounded core plus understandable coarse owners, targeting three-to-five-minute feedback without making that target a product timeout.
- Preserve complete retained coverage for conservative changes, Full regression, nightly, preview, and stable release validation.
- Make GitHub's failed-jobs-only rerun valid for the same run/head/selection while keeping every failed attempt visible.
- Separate durable regression oracles from one-time planning, benchmark, and acceptance evidence.
- Reduce custom identity machinery for checkout-only tests while retaining exact artifact authority wherever emitted or packed bytes matter.

**Non-Goals:**
- Automatic retry of semantic failures, retry-until-green behavior, timeout increases, assertion removal from current product contracts, or weaker startup budgets.
- Reusing success across commits, workflow runs, changed selections, or release candidates.
- Removing multi-platform release validation, changing publication authority, adding paid runners, or changing product runtime behavior.
- Guaranteeing that every regression is detected before merge; complete validation retains its post-merge/nightly/release role, and selective PR validation deliberately trades some pre-merge breadth for faster feedback.

## Decisions

### 1. Replace whole-repository graph authority with coarse reviewed ownership

Use a versioned registry of stable path groups mapped to logical test scopes and targets. Initial groups cover UI/rendering, launch/startup, release/update/package, Pi integration, native containment, history/image compatibility, validation/governance, shared build/package inputs, and directly owned tests/support. A changed test always selects its owner. A shared-support rule selects every declared consumer. Renames, copies, and deletions consult both base and head paths.

The selector may retain lightweight dependency reasons as diagnostics, but a successful parse is not required to honor a known coarse owner. Unknown operational paths, registry errors, selector/workflow changes, and shared validation invalidators select complete coverage or block. This favors predictable over-selection over a complex graph whose conservative issues often select everything anyway.

Alternative: use `vitest related` or changed tests only. Rejected because subprocesses, workers, assets, generated output, and package boundaries are not represented completely by static imports.

Alternative: retain the current graph as the sole authority and optimize it. Rejected because classification speed is not the dominant cost, and its parser/review ledger adds substantial policy and test surface while still requiring broad fallback.

### 2. Define four validation levels

1. **Documentation:** strict OpenSpec and lightweight applicable governance, with no product build.
2. **PR core:** typecheck, architecture, applicable naming/documentation checks, validation-policy integrity, directly changed tests, a bounded public launch/repository smoke set, and coarse owner-selected unit scopes.
3. **Owned integration:** independently scheduled package, startup, rendering, Pi, compatibility, and platform scopes selected by the same registry.
4. **Complete:** every retained fast and integration owner on its declared platforms/runtimes for CI-authority changes, unknown inputs, manual conservative Development, Full regression, nightly, preview as required by its channel, and stable release.

The public `test:fast` and `test:full` commands remain complete local compositions; PR core receives its own named composition and does not redefine `fast` to mean partial coverage. This avoids misleading local and release callers.

The PR core should be one primary Windows Node 24 job unless measured resource isolation requires a selected companion. Integration jobs remain parallel and conditional. Docs-only behavior remains unchanged.

Alternative: run a tiny changed-test lane first and always start the complete suite afterward. Rejected because it improves failure visibility but not green critical path or runner cost.

Alternative: move every integration test to nightly. Rejected because affected startup, package, native, and rendering contracts must still block the PR that changes them.

### 3. Classify tests by durable contract, not by where evidence was recorded

Audit tests that read `openspec/changes/**/evidence`, active change paths, implementation reports, or exact workflow prose. For each assertion:
- retain or create a behavioral/structured test if it protects a current contract;
- move generator/reader behavior to temporary versioned fixtures;
- let strict finalization/audit validate one-time change evidence;
- remove only the recurring assertion whose sole oracle is historical bookkeeping.

The known examples are the integration-selection replay report, the local package-download-cache report, and the exact sentence in terminal-colour guidance. The first two should keep tests for selection and cache behavior but not reread accepted reports. The terminal test should continue verifying `scripts/dev`, inherited streams, and the no-direct-launch policy semantically without pinning prose.

A repository audit will identify similar active-change evidence tests before switching the suite. Historical files remain immutable and are not deleted merely because a recurring assertion is removed.

Alternative: update every test to the dated archive path. Rejected because it postpones the same failure and makes unrelated PR validation depend permanently on implementation records.

### 4. Make aggregation attempt-aware rather than attempt-uniform

Give every modular artifact and envelope an attempt-qualified name. Bind outcomes to `{runId, head, selectionId, logicalJob, target}`. On aggregate attempt `N`:
- if an expected job ran in attempt `N`, its attempt-`N` status is authoritative;
- if GitHub did not rerun that successful job, use its newest successful outcome from an earlier attempt of the same run;
- reject a current-attempt failure, cancellation, malformed result, duplicate authority, changed selection, or missing expected job;
- never read another run or head.

The aggregate should prefer trusted `needs`/Actions conclusions for job status. Compact scope evidence proves that the expected logical owner ran; complete build/package receipts are required only for jobs that consume exact artifacts. The aggregate summary lists reused jobs and original attempt numbers so a rerun cannot masquerade as first-attempt success.

Semantic failures are not automatically retried. A maintainer explicitly choosing GitHub's rerun action is visible provenance; performance gates continue to enforce their own first-attempt rules and may prohibit using a rerun as acceptance evidence even when workflow infrastructure is retried.

Alternative: accept any successful result for the head across workflow runs. Rejected because a new run can use different dispatch inputs, policy, or context and would weaken the stable required check.

Alternative: remove the stable aggregate and require every conditional job in branch protection. Rejected because GitHub required-check handling for dynamically skipped jobs is brittle and the repository intentionally exposes one stable gate.

### 5. Retain receipts only at artifact boundaries

Checkout-only type, architecture, governance, unit, and smoke jobs need head/selection/scope authority, not a digest inventory of all build outputs. Package, startup, update, compatibility, preview, and release jobs retain verified build and candidate receipts because their assertion is explicitly about emitted or packed bytes. Publication remains pack-once and exact-digest bound.

This reduces ordinary evidence generation and aggregate parsing without weakening package identity. Existing dependency-download and Rust caches remain integrity checked; mutable installed state, warmed product state, and passing outcomes are never restored.

### 6. Acceptance is structural plus representative timing, not a benchmark program

Before switching, record one current representative ordinary PR run and one conservative/full run from existing evidence. After switching, require:
- ownership fixtures for ordinary, startup, package, rendering, native, changed-test, rename/delete, shared support, validation-policy, and unknown paths;
- aggregate fixtures for same-attempt success, failed-only rerun success, rerun failure, stale head/selection, duplicates, cancellation, and missing evidence;
- proof that every retained test belongs to PR core/owner coverage and complete cadence;
- deterministic ordinary-path selection replay plus one exact-head hosted observation of the PR-core job's elapsed/runner time, even though this implementation's CI-policy invalidator selects all integration owners;
- one exact-head Development run proving the selected PR core, affected owners, and conservative fallback when this implementation changes validation authority.

The separate manual Full regression workflow is not an acceptance gate for an ordinary development PR. Complete post-merge coverage remains owned by nightly and release validation. Report the three-to-five-minute PR-core target as met or unmet. Do not create a separate benchmark PR or multi-run benchmark requirement, hide failed observations, relax product budgets, or block a correct structural simplification solely because hosted queue variance misses the target.

## Risks / Trade-offs

- **[Coarse ownership misses an indirect dependency]** -> Use broad stable groups, explicit shared inputs/invalidators, changed-test ownership, unknown-path conservative fallback, ownership completeness tests, and complete nightly/release coverage.
- **[A regression lands before complete validation]** -> Disclose the cadence trade-off; retain affected-owner PR gates and require complete validation before publication. Treat repeated nightly escapes as evidence that an owner group must broaden.
- **[Same-head rerun hides a flaky semantic failure]** -> Never retry automatically, preserve all attempt results, show reused attempts in the aggregate, and keep first-attempt performance gates independently authoritative.
- **[The PR core gradually grows into another full suite]** -> Give it an explicit ownership budget and require additions to identify the stable cross-cutting contract that makes them mandatory for every code PR.
- **[Removing evidence assertions deletes useful coverage]** -> Require an assertion-by-assertion audit that maps each removal to current behavioral coverage or explicitly identifies it as one-time finalization evidence.
- **[Simpler checkout evidence weakens exact-package trust]** -> Keep receipts unchanged at every emitted/packed artifact and publication boundary; simplify only jobs whose authority is the checked-out source result.
- **[CI-policy implementation necessarily selects everything]** -> Accept the one-time conservative Development cost; evaluate ordinary-path improvement through reviewed selection fixtures and a representative non-policy PR rather than weakening the implementation PR's own gate or adding a separate Full regression gate.
- **[A skipped draft workflow appears to satisfy branch protection]** -> Give draft-only aggregate checks a distinct non-required identity so only a non-draft exact-head aggregate can satisfy the protected context.
- **[A conservative explicit test selection exceeds a platform process limit]** -> Partition the exact selected file list into bounded invocations and remove consumed orchestration payloads from child environments while preserving complete membership, failures, and one logical owner outcome.
- **[A cold resource fixture polls before its worker is ready]** -> Synchronize the fixture on the service's first structured snapshot instead of increasing a timeout or retrying a semantic assertion.

## Migration Plan

1. Inventory every retained test, current owner, recurring historical-evidence dependency, and current Development job/receipt consumer. Record current ordinary and conservative timing from existing runs.
2. Add the PR-core and coarse owner schema plus fail-closed selection fixtures while the existing workflow still runs complete fast coverage.
3. Replace historical-evidence/prose assertions with hermetic semantic tests, keeping accepted evidence files and current behavior coverage.
4. Introduce attempt-qualified artifacts and attempt-aware aggregate fixtures, then prove failed-only reruns without changing branch protection.
5. Switch Development scheduling to PR core plus selected owners. Keep a conservative switch that selects complete coverage without changing suite membership.
6. Before version-3 finalization, record the deterministic ordinary-path replay and the exact hosted evidence plan. After in-branch finalization, run exact-head normal Development CI and record the PR-core observation, selected owners, actual latency, runner cost, every failed attempt, and any explicit known gap without inventing speedup evidence. Do not manually dispatch Full regression for ordinary PR acceptance; nightly and release retain complete post-merge coverage. Post-finalization hosted gates are acceptance prerequisites, not pre-finalization task-completeness prerequisites.
7. Roll back by selecting complete coverage for every code PR and disabling prior-attempt reuse. Rollback must retain all tests, exact-package receipts, budgets, platform/runtime lanes, and the stable aggregate.

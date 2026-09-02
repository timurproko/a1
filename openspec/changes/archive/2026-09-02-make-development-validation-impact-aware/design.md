## Context

See `proposal.md` for motivation and measured impact. The current development workflow labels its selection step as change-sensitive but emits one hard-coded scope list for every code pull request. The completed GitHub evidence is:

| Evidence | Total / wall time | Material repository work |
| --- | ---: | --- |
| PR #201 successful workflow `33536370678` | 7m57s required workflow; 7m36s Windows fast job | 149s setup plus 297.5s selected validation |
| PR #201 selected validation | 297.5s | 5.5s build, 1.5s typecheck, 2.2s architecture, 5.2s documentation command, 62.1s ordinary Vitest, 9.5s dist integration, 211.5s rendering |
| PR #201 rendering invocation | 211.5s | 127.5s budgets, 62.6s repeated matrix assertions, 19.6s producer protocol, plus invocation overhead |
| Representative August 28 run `33197019593` | about 2m30s fast job | 74.6s selected validation without rendering evidence |
| Ordinary Vitest growth | 53.6s to 60.5s | 1,211 to 1,362 passing tests; material but not the multi-minute cause |

The rendering invocation launched 83 cold TypeScript producer processes: 48 for the eight-workload budget gate, 24 for matrices repeated by separate assertion tests, and 11 focused producer-protocol launches. The successful PR #201 run was also an unusually slow setup sample: setup-node and `npm ci` took about 119 seconds, versus roughly 47 seconds in an earlier attempt against the same lockfile. Setup variance is therefore separated from repository gate cost rather than attributed to tests.

Documentation governance is also composed twice in the ordinary fast path. The `code-documentation` command loads and inspects the tracked repository, then the Vitest remainder includes a repository-baseline test that loads and inspects it again. In the successful PR #201 sample the command took 5.2 seconds and the complete documentation test file took 17.4 seconds; in the prior failed sample that test file took 21.8 seconds, including about 9.9 seconds in its live baseline case. Fixture-based policy tests are valuable; repeating the same real-repository invariant is not.

The rendering harness deliberately isolates bare A1, `a1 pi`, and pinned Pi in separate processes and serializes cold workers on Windows because unconstrained concurrent TypeScript imports were nondeterministic. The optimization therefore cannot trade process isolation, comparison independence, logical-damage budgets, fail-closed behavior, or full nightly/release coverage for speed.

The existing scheduled release workflow resolves authoritative `origin/develop` at 03:17 UTC and then validates a four-platform matrix. Documentation policy is source-static and does not need the same complete repository scan on each platform.

## Goals / Non-Goals

**Goals:**

- Make selection deterministic, reviewable, reusable by local/CI orchestration, and conservative under uncertainty.
- Return ordinary code-PR feedback to the cost of ordinary fast validation when rendering is unrelated.
- Give rendered-shell changes representative paint evidence and rendering-core changes complete evidence.
- Retain independent producers and every existing full rendering workload while eliminating equivalent repeated matrices.
- Inspect real documentation policy only for modified/new development files, then prove the complete repository once nightly.
- Keep one aggregate protected-branch result while allowing independent scopes to run in parallel.
- Gate optimization with structural evidence such as selected scopes, producer launch counts, scan counts, and exact workload coverage; treat wall-clock timing as diagnostic because runner setup varies.

**Non-Goals:**

- Weakening rendering logical-damage budgets or replacing physical acceptance.
- Selecting individual ordinary unit tests; the ordinary fast remainder remains mandatory for code pull requests.
- Caching rendering evidence across commits or trusting stale artifacts.
- Making documentation policy platform-dependent.
- Changing A1 runtime behavior, Pi packages, public APIs, dependencies, or release artifact semantics.
- Solving GitHub runner/cache variability, although timing evidence will expose it separately from repository test cost.

## Decisions

### 1. Use one versioned impact-selection result as the workflow source of truth

A repository-owned selector will accept an explicit base commit, head commit, and optional worktree state and emit a bounded JSON result. The result will include schema/version, base/head identity, complete name-status changes, ordinary validation scopes, rendering tier, documentation inputs, reasons, conservative fallbacks, and classifier timing. CI will compute it once in the change-detection job and pass its outputs to modular jobs. Local validation will invoke the same selector against the merge base with `origin/develop`, then include staged, unstaged, and policy-relevant untracked files.

The selector will preserve rename sources and destinations rather than reducing the diff to head paths. Missing history, malformed status, unsupported inputs, or analysis failure will be represented as an explicit conservative result, not an empty selection.

Alternative considered: keep classification as shell conditionals in each workflow job. Rejected because duplicated conditions drift, are difficult to unit test, and cannot provide one auditable reason chain.

### 2. Derive rendering involvement from base/head TypeScript reachability plus explicit invalidators

The selector will use the TypeScript resolver already available to the repository to build module reachability rooted at declared rendering producer/runtime entries, including `test/support/rendering/rendering-producer-worker.ts`. It will evaluate both merge-base and head graphs so a deleted or renamed dependency remains visible. A changed file reachable in either graph selects rendering. Dependency reasons will be bounded paths from an entry to the changed module.

Static reachability cannot represent resource reads, package resolution changes, generated proxies, or validation semantics. A small reviewed invalidator inventory will therefore force full rendering evidence for terminal/package identity, lock/manifest and module-resolution inputs, rendering fixtures/baselines, workflow selection, and rendering harness infrastructure. Unknown relevant extensions and unresolved graph edges fail closed to full.

Alternative considered: GitHub `paths` globs. Rejected because a shared component, barrel, theme, or engine presenter can affect rendering transitively while residing outside a narrow renderer directory; broad `src/**` globs recreate the current unconditional cost.

Alternative considered: `vitest --related`. Rejected because the rendering test spawns `rendering-producer-worker.ts` by URL and the production imports occur inside that child process, so Vitest's test dependency graph cannot observe the material edge.

### 3. Classify rendering as none, smoke, or full

The rendering tier will be selected as follows:

- `none`: no changed path is reachable from rendering entries and no invalidator changed.
- `smoke`: a reachable rendered shell, status, transcript component, presenter, engine presentation, or theme changes without touching full-critical infrastructure.
- `full`: viewport composition, frame descriptors, selection-to-paint interaction, stream coalescing/scheduling, terminal/runtime adaptation, paint grammar, rendering workload/capture/replay/budget infrastructure, package/terminal identity, or the impact classifier changes; uncertainty also selects full.

The smoke scope will run a declared representative set that includes independent bare-A1/`a1 pi`/pinned-Pi producers, regular and mode-matched fullscreen comparison, terminal replay, semantic parity, synchronized-update classification, logical damage, initial/status presentation, ordinary streamed prose, and followed transcript movement. The full scope retains all eight deterministic workloads plus producer failure, timeout, malformed protocol, and determinism coverage.

This makes PR #201-type shell presentation changes rendering-relevant but avoids treating a three-period status formatter as equivalent risk to changing the damage-aware terminal.

Alternative considered: rendering on/off only. Rejected because it either skips evidence for visible shell changes or charges every such change for the complete infrastructure matrix.

### 4. Capture each selected rendering matrix once per gate

The full evidence orchestrator will produce a map keyed by workload, producer, and mode. Budget, semantic parity, paint, dock, determinism, and workload-specific assertions will consume that captured map. The representative determinism contract may request one deliberate second capture for its declared workload; this is not considered duplication because the second run is the observable under test. Producer protocol failure/timeout tests remain focused and independent.

The current separate matrix and budget tests repeat four complete matrices already included by the all-workload budget test, accounting for 24 cold launches and about 63 seconds in PR #201. Consolidation removes those equivalent launches while retaining every assertion. Full runs continue launching separate short-lived producer processes rather than introducing a long-lived worker whose module or session state could contaminate later workloads.

Alternative considered: parallelize all cold workers. Rejected because prior Windows evidence found nondeterministic import contention. Bounded concurrency may be explored later only with repeated deterministic evidence; it is not required by this change.

Alternative considered: cache matrices across CI runs. Rejected because evidence must bind to the exact current head and stale paint output could hide a regression.

### 5. Separate documentation rule tests, changed-file enforcement, and full review

Documentation validation will have three distinct responsibilities:

1. fixture-based Vitest tests always exercise classification, public contracts, comment hygiene, formatting, and failure cases without scanning the live repository;
2. the development command receives the selector's modified, added, copied, and renamed-to policy-relevant paths and inspects those complete files, resolving only bounded owner/export metadata needed to determine their obligations;
3. the full command enumerates every tracked policy-relevant path and is used by nightly and explicit complete review.

Deletion-only entries have no content to inspect. Development diagnostics are scoped to changed/new destinations. The existing live-repository baseline test will be removed or converted to changed-file orchestration fixtures so the authoritative command is the only real-repository scan in that tier.

The nightly release will run the full command once in a platform-independent job against the exact authoritative source. Its result will gate nightly completion and be reusable as an explicit prerequisite for the platform matrix rather than running the same scan four times. Manual complete regression/release paths will retain one full review, and local complete validation will invoke it once.

Alternative considered: retain a full PR scan but remove only the duplicate test. Rejected because the user selected modified/new-file development enforcement and complete nightly review, and full scans scale with repository size even when a change touches one file.

Alternative considered: check only changed lines. Rejected because class contracts, file source role, imports/exports, and comment structure require complete changed-file context.

### 6. Run ordinary, rendering, and documentation validation as modular jobs

The pull-request workflow will have these logical branches after classification:

```text
change classification
    |
    +--> ordinary fast + architecture (Windows, every code PR)
    +--> changed-file documentation (platform-independent, when inputs exist)
    +--> rendering smoke/full (Windows, only when selected)
    +--> process containment matrix (existing policy)
    |
    +--> one aggregate required check bound to head + selection
```

The documentation and rendering jobs run in parallel with ordinary validation. A `none` rendering result is accepted only when the current selector says `none`; a skipped job selected as smoke/full fails aggregation. Documentation no-input is similarly explicit. The aggregate remains the branch-protection authority, so modular job names may evolve without ruleset churn.

The ordinary fast scope no longer embeds the live documentation scan or rendering scope. It retains policy unit tests, all ordinary tests, typechecking, architecture, and dist integration. Preview/stable/release compositions will declare their scopes explicitly rather than inheriting an accidental duplicate through `fast`.

### 7. Prove quality preservation structurally and report wall time diagnostically

Automated evidence will assert:

- representative direct, transitive, unrelated, added, deleted, renamed, dynamic invalidator, and classifier-error changes select the expected rendering tier;
- smoke includes every declared representative contract and full includes every deterministic workload;
- each non-determinism workload key is captured once per gate;
- documentation development selection contains exactly modified/new policy-relevant destinations and no deletion-only source;
- the ordinary tier performs zero complete live-repository documentation scans;
- nightly performs exactly one complete documentation scan and platform jobs perform zero;
- aggregate behavior rejects stale, missing, failed, or unexpectedly skipped modular outcomes.

Workflow summaries will separate setup time from repository gate time and report producer launches, matrix captures, documentation files inspected, full scan count, and per-scope duration. PR #201 and the pre-rendering representative run establish diagnostics, not universal millisecond thresholds: GitHub's Node/cache/install setup varied by roughly 80 seconds between runs on the same lockfile. Structural counts and coverage are the deterministic acceptance gate.

## Risks / Trade-offs

- **[Static reachability misses dynamic runtime inputs]** -> Maintain an explicit small invalidator inventory, cover it with governance tests, and fail closed to full on unresolved or unknown relevant inputs.
- **[The dependency graph over-selects through barrels]** -> Accept conservative smoke selection first, emit reason chains, and narrow only with evidence; over-selection costs time while under-selection costs confidence.
- **[Smoke evidence misses a workload-specific regression]** -> Restrict smoke to non-core rendered surfaces, require representative producer/paint/damage coverage, force core/harness/classifier changes to full, and retain complete nightly/release evidence.
- **[Changed-file documentation misses an interaction with old source]** -> Resolve bounded owner/export metadata for changed files, retain fixture coverage for cross-file rules, and make the nightly full review a blocking invariant with actionable evidence.
- **[Nightly detects a violation after merge]** -> Keep `develop` as the trusted incremental baseline, fail nightly publication, identify the introducing commit from nightly-to-nightly changes, and repair before unrelated work proceeds under the existing failing-validation rule.
- **[Modular jobs complicate branch protection]** -> Keep one stable aggregate required check and test every selected/skipped/stale result combination.
- **[Evidence sharing accidentally hides process isolation]** -> Share immutable captured results only after separate producer processes complete; do not share live shells, terminals, profiles, or worker module state.
- **[Timing improvement is hidden by runner setup variance]** -> Report setup and repository phases separately and gate invocation/scan counts rather than unstable wall-clock limits.

## Migration Plan

1. Add classifier schemas and synthetic base/head fixtures while the current workflow remains authoritative; compare proposed selections against representative historical changes.
2. Split documentation policy unit tests from live-repository enforcement, add changed-file and full modes, and prove their path/diagnostic behavior before changing CI.
3. Consolidate rendering capture and assertions, prove identical workload/budget coverage and lower launch counts, and add the smoke scope.
4. Introduce modular CI jobs and aggregate logic behind governance tests; initially fail closed to current full rendering whenever selection evidence is incomplete.
5. Add the single nightly full-documentation job and remove full documentation work from platform matrix composition only after prerequisite propagation is proven.
6. Compare exact workflow outcomes and structural counts on unrelated, smoke-rendering, full-rendering, and governance fixture changes. Preserve the current workflow as the rollback reference until required CI passes.
7. If modular selection or aggregation is unreliable, restore unconditional full rendering and full documentation scanning while retaining timing evidence; do not weaken rendering budgets or silently accept missing documentation results.

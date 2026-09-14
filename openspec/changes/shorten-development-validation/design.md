## Context

See `proposal.md` for motivation and scope. Planning baseline is fresh `origin/develop` at `0bc3624f`; no implementation or workflow change is included. The current selector has a rendering graph and naming/documentation policies, but ordinary scopes are fixed and startup/containment jobs run for almost all code changes. `runTierPlan` serializes the fast remainder, resource-sensitive partition, and explicit tests. `npm ci` runs the package `prepare` build, yet ordinary and Unix containment tier invocations build again.

### Observed GitHub evidence (2026-09-14)

| Source | Fast job | Startup job | Rendering job | Status |
| --- | ---: | ---: | ---: | --- |
| PR #398, run [34872523798](https://github.com/timurproko/a1/actions/runs/34872523798), head `5079baf8b5469ec05e3f81de28e776802c3ae9c6` | 554s | 396s | 308s | successful |
| PR #400, run [34879154754](https://github.com/timurproko/a1/actions/runs/34879154754), head `fd7f1258a4c8814f0215259cb5f072b228ff3a6c` | 456s | 450s | 243s | fast/aggregate failed |

PR #398's ordinary step was 298s: build 15s, typecheck/architecture 5s, fast remainder 198s, resource-sensitive partition 66s, dist integration 14s. Its subsequent Pi/release/resume step was 171s, including `release-command.test.ts` at 105s and `session-resume.integration.test.ts` at 54s. The fast remainder included `package-message-parity.test.ts` at 84s. File durations overlap within parallel invocations and must not be added as wall time.

PR #400's startup job spent 62s installing/building, 19s packing, about 290s invoking package-install tests, 44s on image/history, and the remainder on runner overhead. The package suite reported 287.66s including hooks; named scenarios included startup preparation/execution at 75.64s, dependency-layer materialization at 24.20s, backlog cleanup at 19.32s, and two recovery cases at about 1.98s combined. Its six measured launches were 2566, 2539, 2450, 2393, 2497, and 2288ms: 14.733s total. Roughly 166s was not attributed by the existing per-test report, principally hooks/other work; clean global install is a hypothesis, not a measured attribution. Teardown also reported deferred locked Windows fixture cleanup. Explicit hook timing is necessary before claiming an installation speedup.

PR #400 failed `Windows exclusive file handles produce a safe partial result` in its new local-cleanup tests. This is not a startup budget failure and is not fixed here. PR #402 addresses predecessor worker responsiveness/nightly recovery separately. Historical failed samples inform cost but cannot establish a green baseline or acceptance. Do not stack implementation on those unaccepted branches or import their fixes implicitly.

## Goals / Non-Goals

**Goals:** Reduce the critical path by selecting only justified expensive integration owners, remove unnecessary sequencing without recreating contention, measure hidden fixture costs, and prove unchanged contract coverage. Keep the complete ordinary fast population; targets cannot be achieved by silently choosing only changed unit tests.

**Non-Goals:** Runtime/module-graph optimization, blanket worker-count increases, moving every expensive test to nightly, new hosted infrastructure, dependency upgrades, production cache changes, semantic retries, timeout increases, baseline regeneration, or weakening release/package/Defender authority. Repairing unrelated failures requires their existing streams. This proposal does not claim historical archived known gaps are resolved.

## Decisions

### 1. Extend the existing selector, not workflow-local path filters

Introduce a versioned integration selection alongside the existing rendering/naming/documentation fields. Each selected scope carries its owner, platform/runtime applicability, reasons, and explicit exclusion/fallback status. Bind one normalized selection digest to base, head, and authoritative ownership configuration; every consuming job uses that exact artifact. The aggregate rejects unsupported schemas and partial migrations rather than interpreting missing fields as false.

Use declared scope test entries and product entries with base/head graph reachability. Include literal imports/exports and declared edges for dynamic imports, spawned JS/TS entries, workers, native guardian manifests/binaries, assets, generated payload inventory, package imports/proxies, and build mappings from emitted `dist` to source. Do not treat the current rendering graph's relative-import traversal as proof that these additional edges are covered. Unsupported aliases or computed loads require an explicit reviewed edge/invalidator or conservative selection. Batch repository reads and memoize graphs per revision within classification to avoid one complete scan per scope. If safe classification exceeds bounded work, select all applicable integration scopes; unknown head or malformed selection blocks.

Explicit invalidators include package manifests/lockfiles, module-resolution/build configuration, suite ownership, selector/aggregate/tier code, shared fixture infrastructure, and applicable workflow changes. Selector/ownership changes select all development integration scopes. Preserve old/new paths for copies/renames and deleted base entries. Classify unknown operational paths conservatively; never silently consider them documentation. Retain existing docs/version exemptions for genuinely qualifying changes. A manual Development dispatch without a trusted comparison runs the full retained development selection, not the result of comparing a commit with itself.

Initial selection inventory:

| Logical owner | Relevant entries/invalidators | PR runtime policy |
| --- | --- | --- |
| Fast remainder and resource-sensitive partition | Entire retained fast inventory | Windows Node 24, always for applicable code |
| Dist integration | Existing dist tests, launch scripts, emitted worker inputs | Windows Node 24, retained ordinary prerequisite |
| Pi conformance and release/resume integration | Existing engine, release-command, transition and package-smoke tests plus their graphs | Windows Node 24 when impacted |
| Exact-package install/identity, layers, recovery and cleanup | Extracted package-install contracts plus package/build/worker/lifecycle dependencies | Windows Node 22 when impacted; preserve applicable Unix package owners |
| Startup timing | Public/private launch chain, runtime graphs, native guardian, startup fixtures, assets | Windows Node 22 when impacted; no Node 24 PR startup |
| Image/history compatibility | Existing image/history tests and emitted workers plus transitive inputs | Node 22 Windows and Node 24 Unix where impacted |
| Unix supervision/containment | Existing native/lifecycle/private-contract/package-smoke owners | Linux/macOS Node 24 when impacted |

The table specifies initial groups, not permission to drop tests. Produce a before/after test-and-scenario ownership ledger before migrating configuration. Changed tests outside normal PR scopes (including predecessor or launch integration) explicitly promote their retained owner into current-head PR validation; shared support promotes every affected owner. Existing default full-only ownership otherwise remains unchanged.

Alternative: narrow GitHub `paths` globs or `vitest --related`. Rejected because subprocess, asset, generated, and dynamic dependencies escape those graphs. Prefer over-selection to an unjustified skip, even if broad runtime imports mean many UI PRs still need startup.

### 2. Parallelize jobs, not sensitive workloads on the same host

Keep one stable `Development validation required` aggregate. Logical dependency graph:

```text
complete impact selection
  +--> fast remainder + typecheck/architecture + dist (Windows 24)
  +--> resource-sensitive fast partition (isolated Windows 24)
  +--> selected Pi/release/resume integration (Windows 24)
  +--> selected exact-package non-timing checks (Windows 22)
  +--> selected first-attempt startup (isolated Windows 22)
  +--> selected image/history compatibility (Windows 22)
  +--> selected Unix integration owners (Linux/macOS 24)
  +--> existing rendering, documentation, naming or docs governance
  +--> current-head aggregate after every required result
```

Logical owners can share a job only when this does not reintroduce a startup timing tail or duplicate selected files. The resource-sensitive job remains one file at a time and does not run beside another test partition on the same runner. `fast` remains the public composition of remainder plus resource-sensitive scopes, so local and full-release commands preserve population and ownership; expose atomic partitions for CI. Full validation may retain serial execution for resource isolation. A duplicate-owner check rejects accidentally retaining extracted files in both the fast remainder and explicit owners.

Avoid a central cross-job `node_modules` or candidate build artifact in this iteration: platform/native content, toolchain differences, transfer cost, and artifact trust complicate it. Per-job builds may repeat across independent runners; only avoid redundant builds inside a job. Track runner-seconds as well as elapsed time because more jobs may cost more even while feedback improves.

Alternative: start independent suites as background processes on one Windows host. Rejected because it reverses the existing resource-contention fix and can corrupt timing evidence.

### 3. Split startup fixtures by contract and retain clean boundaries

Extract the seven current package-install scenarios into explicit startup and non-timing owners. The non-timing owner can retain one fresh installed package for compatible identity/layer/recovery/cleanup scenarios with separate scenario data roots, as today. Startup owns a separate fresh installation so unrelated fixtures cannot silently warm the measured product path. It retains its existing two profiles and post-update/no-live-supervisor/warm sequence, Defender prerequisite, declared preparation, budgets, first attempts, and shutdown assertions. Image/history tests become independent compatibility owners rather than a post-startup tail.

Splitting may increase total install work when all owners are selected. Do not hide this cost or share mutable startup state to compensate. Evaluate measured total runner cost and conservative-full timing before acceptance. Full-regression and release compositions expand the old owner into all successor scopes, preserving exact-package identities, both Windows runtimes and existing Unix applicability. Full invocations deduplicate file ownership while intentional cross-runtime executions remain explicit.

Alternative: filter just the startup test by title or shrink the 42-release/128-file cleanup fixture. Rejected: title filters obscure full ownership and reduced workloads weaken retained regression coverage.

### 4. Reuse verified prerequisites, not unchecked readiness flags

Retain lifecycle scripts needed for supported installation. After successful `npm ci`/build, record a job-local receipt identifying source SHA, source/build inputs, Node/toolchain, OS/architecture, lockfile, and expected emitted/native inventory. Tier execution verifies compatible inputs and artifact presence/digests before accepting the receipt. Existing `VALIDATION_BUILD_READY` and `VALIDATION_CANDIDATE_TARBALL` plumbing may transport the location but are not sufficient proof by themselves. A missing/mismatched receipt triggers a build/pack or fails explicitly; never consume stale `dist`.

Pack once per job where needed and bind consumers to that tarball digest. Add startup's missing Rust cache keyed by OS/architecture, toolchain, Cargo lockfile, and native sources; still run the build and validate its resulting manifest/digest. Audit npm cache use by global fixture installs; use compatible integrity-checked download cache/prefer-offline behavior where it reduces redundant registry work while retaining required resolution and fresh prefixes. Do not force offline mode when needed dependencies are absent. Do not cache installed package prefixes, certified dependency layers, startup compile caches, or passing results across attempts.

Alternative: `npm ci --ignore-scripts` everywhere or reuse one installed tree across Node runtimes. Rejected because native/lifecycle outputs and clean-install behavior are part of the product contracts. Removing duplicate build invocations should not silently remove lifecycle work.

### 5. Measure before optimizing fixture internals

Emit bounded start/completion/failure phase records immediately, plus a final summary, so beforeAll failures are not invisible until teardown. Record install, proxy synchronization, packing, materialization, certification, declared warmup, launch profile/kind, shutdown, and cleanup separately. Include candidate digest and environment identities without dumping captured output or environment secrets. Upload ordinary outcomes too; the current workflow uploads resume/startup evidence but not the ordinary outcomes file as a dedicated artifact. Report known deferred cleanup accurately, not as a clean teardown claim.

Profile `release-command.test.ts`, `package-message-parity.test.ts`, and `session-resume.integration.test.ts`. Where repeated repository initialization or immutable package preparation dominates, create an immutable template once and materialize fresh writable instances for mutations. Reuse completed immutable captures only when multiple assertions intentionally inspect the same scenario, never across independent parity producers or first-attempt measurements. Keep real child processes for command/protocol/oracle boundaries, no shared mutable global settings, and deterministic readiness handshakes instead of unnecessary fixed sleeps where the sleep is not the behavior being tested. Preserve purposeful held-lock delays and all workload sizes. Any optimization requiring production edits or altered semantic coverage needs a plan refinement first.

Alternative: optimize the highest duration by name without phase data. Rejected because file duration includes contention and hooks, and can misidentify the real cost.

### 6. Acceptance uses structural guarantees and honest timing

Mandatory structural evidence:
- Complete selection fixtures cover unrelated tooling, transitive startup, assets/native inputs, image/history-only ownership, rename/delete/copy, changed tests, shared support, unknown inputs, classifier failure, and manual-dispatch fallback.
- Every retained scenario maps to one owner per applicable platform/runtime; no disappearance from full-regression or any release mode that previously required it.
- Aggregate fault tests cover each selected job's failure, cancellation, missing/stale/malformed evidence, unexpected skip, and selection-authorized skip.
- Fast partitions remain complete, disjoint, same timeout policy, and isolated; startup retains all current first-attempt budget assertions with Defender enabled.
- Compatible same-job setup builds/packs once; stale receipts or caches cannot supply false evidence; clean prefixes and failure cleanup remain verified.

Timing assessment uses at least three independent first-attempt CI observations per representative class (unrelated operational, startup-sensitive, conservative-full) at identified revisions, with successful and failed samples retained. Record runner label/version, Node version, cache hit/miss, selection, phase data, total runner-seconds, critical-path gate time, and workflow elapsed/available queue time. Use medians and ranges; distinguish these new observations from the two historical baseline samples, which are not a matched controlled trial. Capture comparable pre-optimization baseline measurements before the orchestration switch. Include a cold-cache control without turning repeated benchmarks into semantic retries; any failure blocks acceptance until diagnosed, and no attempt is discarded.

Targets are 2–3 minutes for ordinary changes and under five minutes for startup-sensitive PRs, excluding uncontrollable queue delay but including setup and aggregation. These are goals, not hard product budgets. The current mandatory fast population already takes several minutes; broad reachability and cache variance may prevent the target. Report actual improvements and unmet goals for explicit maintainer disposition rather than cutting coverage. This optimization's own workflow/config changes conservatively select all integration, so a green implementation PR alone cannot demonstrate the unrelated-change path. Use read-only historical selection replay plus isolated CI selection fixtures/authorized representative runs with recorded base/head identities; synthetic selection results must not replace real startup/full-validation acceptance.

## Risks / Trade-offs

- **[Unmodelled dependency causes a false skip]** -> Base/head graphs, explicit dynamic edges, changed-test promotion, unknown-input fallback, current-selection aggregate checks, and complete full validation; keep unconditional fallback available.
- **[Ordinary fast work remains the critical path]** -> Preserve population, optimize measured fixtures, and report missed targets honestly; no blanket unit-test selection is authorized.
- **[More isolated jobs increase downloads/runner cost]** -> Measure total runner-seconds, share only safe immutable inputs within jobs, and compare conservative-full cost before accepting the topology.
- **[Build receipt or cache trusts stale/malicious bytes]** -> Bind inputs and digests, reject mismatches, retain native build verification and exact-package identity; never let PR cache contents become publication authority.
- **[Fixture reuse weakens cold-state/parity evidence]** -> Separate startup installation and mutable scenario state, preserve independent oracle processes, and test contamination/failure paths.
- **[Conditional integration delays an unforeseen regression until nightly]** -> Disclose this cadence trade-off, keep conservative invalidators and on-demand full validation, and do not permit a failing full/release lane to publish.
- **[Concurrent validation projects conflict]** -> Reconcile suite/selector changes against accepted `develop` before implementation; no predecessor or worktree-cleanup behavior changes here.

## Migration Plan

1. After explicit implementation approval, inventory the current accepted owners and collect phase-attributed baseline evidence before selection behavior changes.
2. Add successor scopes, ownership/fallback tests, receipts, and timing while retaining unconditional workflow selection. Prove full/release equivalence first.
3. Add independent fast/integration jobs and same-job setup reuse with aggregate negative tests; retain the conservative-all switch as rollback.
4. Enable integration impact selection only after graph/invalidator and changed-test coverage passes. Preserve docs/version/draft policies and the Node 22-only PR startup cadence.
5. Validate the exact implementation head in normal required CI and the four-lane manual Full regression. Inspect every result without treating green fixtures as live coverage. Keep existing publication scope enforcement intact; do not trigger publication as part of this optimization experiment.
6. Collect representative feedback/cost evidence, update implementation documentation, and obtain actual maintainer acceptance with goals and remaining risks stated explicitly.
7. If selection or reuse is unreliable, restore unconditional integration selection and fresh build/pack execution, retaining the new diagnostics. Rollback must not remove tests, relax budgets, or accept a stale aggregate. Rollback of fixture extraction uses the recorded ownership ledger.

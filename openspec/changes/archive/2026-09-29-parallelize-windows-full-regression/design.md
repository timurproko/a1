## Context

The reusable Full regression workflow currently has one matrix job for each of Windows Node 22, Windows Node 24, Linux Node 24, and macOS Node 24. Each job builds and packs once, prepares one exact installation, and asks `run-validation-tier.mjs` to execute the complete `full-release` plan. `runTierPlan` deliberately executes command gates and Vitest invocations in sequence.

Run `36400505675` shows that sequencing is the Windows bottleneck:

| Work | Windows Node 24 | Linux Node 24 |
| --- | ---: | ---: |
| Exact-package preparation | 131.8s | 4.1s |
| Ordinary Vitest partition | 900.4s | 159.8s |
| Resource-sensitive partition | 250.6s | 85.8s |
| Isolated rendering partition | 368.4s | 129.2s |
| Complete validation step | 1729.7s | 420.5s |

The ordinary Windows partition also contains the exhaustive published-predecessor test, which consumed 563 seconds, including four fresh npm installs totaling about 489 seconds. This change does not alter those installations or their oracle. It removes independent partitions from the same critical path.

The existing lane envelope accepts one successful `a1-validation-outcomes-v1` result containing the complete selected scope list. Sharding therefore requires trusted reconstruction: accepting any individual shard as a complete lane would make missing work appear successful.

## Goals / Non-Goals

**Goals:**

- Run independent Windows complete-regression work concurrently on separate hosted runners for both Node 22 and Node 24.
- Preserve the exact complete scope/test set and execute each owned command or Vitest invocation exactly once per Windows runtime.
- Preserve serial resource-sensitive execution and serial rendering-producer execution inside their respective runners.
- Preserve first-attempt exact-package startup, Defender, package identity, startup trend, predecessor, and failure evidence.
- Reconstruct one existing Windows lane result only from complete exact-run shard evidence.
- Keep failed shard logs and owner outcomes usable by nightly regression triage.

**Non-Goals:**

- No test removal, workload reduction, timeout increase, semantic retry, assertion change, or broader Vitest worker pool.
- No Defender exclusion or reuse of mutable package/startup state across jobs.
- No optimization of npm predecessor installation in this change.
- No sharding of Linux, macOS, local full validation, or publication validation.
- No change to branch protection, publication, or merge authority.

## Decisions

### 1. Use four reviewed Windows shards

Add a first-class complete-regression shard plan with these stable identities:

- `core`: complete command/governance gates and the ordinary bounded-parallel Vitest remainder.
- `resource`: the existing resource-sensitive invocation, still one process with file parallelism disabled and the explicit unchanged hang bound.
- `rendering`: the existing isolated rendering-stability invocation, whose workloads and producers remain serial inside the runner.
- `package`: update timing, package smoke, first-attempt startup, package contracts, and the exhaustive published-predecessor invocation.

The predecessor test will become an explicit full-plan invocation and be excluded from the ordinary remainder. Its predecessor count, installation behavior, time limits, and assertions remain unchanged. The package shard will prepare the exact installation, enable Defender, run startup before later package-contract work, and retain the existing startup evidence path.

Combining resource-sensitive or rendering work with the core shard is rejected because it leaves large independent partitions sequential. Running those tests concurrently inside one runner is rejected because their isolation contracts explicitly avoid shared Windows contention.

### 2. Repeat immutable preparation instead of sharing mutable workspaces

Each Windows shard checks out the exact source, installs dependencies, builds, and records its own authenticated build receipt. Only the package shard packs the candidate and prepares the exact package because only that shard consumes package owners. This adds runner work but avoids transferring `node_modules`, temporary installation prefixes, process state, or mutable test roots between jobs.

A common build artifact job is rejected for the first implementation because emitted dependencies and native build state would need a new cross-job integrity and platform contract. The existing per-runner build receipt already supplies a reviewed boundary.

### 3. Derive shards from one canonical full plan

`validation-tier.mjs` will continue to construct the complete deduplicated `full-release` plan first. A reviewed partition function will assign every canonical command and Vitest invocation to exactly one shard, reject unknown or duplicate ownership, and preserve the original invocation arguments and evidence. `run-validation-tier.mjs --full-shard <id>` will emit a shard result carrying its shard identity and canonical-plan digest.

Hand-authored independent scope selections are rejected because overlapping full-suite owners could duplicate tests or omit a cross-owned scenario. Partitioning the canonical plan keeps one source of truth.

### 4. Merge shards fail closed before binding a lane

A Windows lane collector will require all four expected shard results from the same source, runtime, workflow run, attempt, and canonical-plan digest. It will reject a missing, duplicate, stale, malformed, cancelled, or unexpected shard; require the exact assigned command/invocation outcomes; preserve deterministic canonical outcome ordering; and produce an ordinary `a1-validation-outcomes-v1` full result only when all shards passed.

The existing `full-regression-evidence.mjs` then binds that reconstructed result to `windows-2025-node22` or `windows-2025-node24`. The final aggregate continues to require exactly the same four lane identities. No shard result alone can satisfy branch protection or selected PR Full regression.

A collector that trusts only GitHub job conclusions is rejected because it would not prove scope coverage. Extending the protected aggregate to treat shards as additional public lanes is rejected because runtime/platform support remains four lanes, not ten.

### 5. Preserve failure and triage evidence per shard

Every shard uploads its result and applicable phase/startup artifacts under a name containing source, run, attempt, Windows runtime, and shard. Upload remains `if: always()`. The Windows collector reports orchestration failure when reconstruction cannot succeed, while nightly triage reads failed shard outcomes and maps them back to the canonical Windows lane plus shard job so the failed owner and log remain actionable.

Startup trend collection will continue to find exactly one startup evidence file for each Windows runtime, from the package shard. Duplicate startup evidence for a lane will fail policy tests rather than silently choose one.

### 6. Keep non-Windows and publication paths unchanged

Linux and macOS retain the existing single-job complete plan and lane envelope. `publish.yml` retains its current validation matrix and sequential full plan because exact release-package orchestration and publication critical paths are outside this request. Local `npm run test:full` remains one complete plan.

This bounded scope avoids changing stable release authority while still improving standalone and selected PR-attached Full regression, both of which call `full-regression-shared.yml`.

## Validation Matrix

| Layer | Evidence |
| --- | --- |
| Plan partition | Canonical full-plan commands and invocations belong to exactly one of four shards; union equals the unsharded plan |
| Core | Ordinary tests and command gates retain arguments, two-worker bound, ownership, and outcomes |
| Resource | Every declared resource-sensitive file runs once, serially, with the unchanged explicit timeout |
| Rendering | Every full rendering workload remains present and producer execution remains serial inside its runner |
| Package | Exact candidate is packed once for that runtime; Defender precedes first startup; startup precedes contracts; all smoke/update/predecessor owners remain |
| Evidence | Missing, duplicate, stale, failed, cancelled, wrong-plan, or cross-runtime shard evidence cannot create a lane envelope |
| Triage | A failed shard produces its canonical Windows lane, shard job, failed owner, tests, and bounded log excerpt |
| Workflow | Windows Node 22/24 each schedule all four shards; Linux/macOS retain one complete job; final aggregate still requires four lanes |
| Performance | A dispatched exact-head Full regression reports Windows shard timings and demonstrates that independent shards overlap; elapsed result and any remaining bottleneck are recorded without weakening gates |

## Risks / Trade-offs

- **More Windows runner minutes.** Dependency installation and build repeat across four runners. The trade buys lower wall-clock latency while keeping mutable state isolated; timing summaries make the cost visible.
- **Evidence complexity.** A bug in shard aggregation could omit work. Canonical-plan digests, exact assignment checks, complete-union tests, and unchanged final lane binding make omission fail closed.
- **Package shard remains relatively long.** Published-predecessor npm installation remains intentionally unchanged, so this shard may define the new critical path. Its timing will guide a separate optimization rather than expanding this scope.
- **GitHub matrix failures can cancel downstream defaults.** Collector and required jobs use explicit `always()` conditions and artifact uploads so failure remains visible, but no failed or absent shard can produce successful lane evidence.
- **Triage job names change.** Parsing and regression tests must preserve canonical lane mapping while retaining shard identity.

## Migration Plan

1. After explicit approval, add canonical shard planning, result identity, and fail-closed merging with focused unit tests.
2. Update the reusable Full regression workflow to use four Windows shards and unchanged non-Windows lanes, then update governance and triage tests.
3. Reconcile exact scope ownership, evidence uploads, startup trend discovery, and the four-lane aggregate before finalization.
4. Dispatch Full regression on the exact implementation head, record overlap and elapsed Windows timings, and keep any failed owner as a blocker.

Rollback uses a later corrective PR restoring the single Windows full-plan jobs. It must retain both Windows runtimes and every complete-regression owner; no partial shard result may be accepted during rollback.

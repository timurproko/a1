## Context

Stable candidate run `37647598156` exposed two independent sources of Windows elapsed time:

| Work | Windows Node 24 | Linux Node 24 |
| --- | ---: | ---: |
| Exact-package preparation | 217.6s | 9.6s |
| Core Vitest remainder | 330.5s | 220.0s |
| Resource-sensitive partition | 221.8s | 125.2s |
| Rendering partition | 280.2s | 234.3s |
| Published-predecessor invocation | 1027.4s | 40.9s |
| Complete validation job | 39m 19s | 12m 37s |

The predecessor invocation installed the candidate once, installed three recent predecessors for materialization/warmup, then installed the newest predecessor again for Windows protected replacement and installed `0.2.2` for the declared bridge. On Windows Node 24 each npm installation took roughly 125–152 seconds. The package shard had already created and authenticated an exact candidate installation before this invocation.

Standalone and selected PR Full regression already partition the canonical plan into `core`, `resource`, `rendering`, and `package` shards and reconstruct a lane only from all four exact-run results. Publication validation predates that orchestration and still runs one monolithic job per lane.

## Goals / Non-Goals

**Goals:**

- Remove independent core, resource, and rendering work from each Windows publication lane's package critical path.
- Reuse the existing canonical shard planner and fail-closed merger rather than creating a second publication-specific ownership model.
- Remove duplicate npm installations from predecessor validation while continuing to execute exact published predecessor code and exact candidate bytes.
- Preserve candidate/nightly diagnostics, startup evidence, stable-candidate authority, and downstream workflow behavior.
- Make timing and remaining bottlenecks visible per shard and predecessor phase.

**Non-Goals:**

- No reduction in scopes, tests, assertions, predecessor count, supported runtimes, or platform coverage.
- No parallel npm installations inside the predecessor fixture, shared mutable workspace across jobs, timeout increase, retry, or ignored failure.
- No sharding of Linux, macOS, local `npm run test:full`, or bounded development-preview validation.
- No change to package construction, release-note authority, npm publication, or candidate adoption.
- No product self-update or installer behavior change.

## Decisions

### 1. Shard only publication modes that select `full-release`

Nightly and candidate modes select the complete full-release suite, so each Windows Node 22/24 lane will schedule the existing four shard identities. Linux and macOS remain sequential. Development mode keeps its existing package smoke/install selection and three Node 24 platform lanes; it does not pay four Windows setup jobs for bounded work. Stable mode continues to skip validation because it adopts the exact package pair from the successful candidate run.

Publication matrix planning will expose separate outputs for the complete platform set, sequential validation lanes, and Windows shard lanes. The complete platform set remains authoritative for post-publication smoke, so sharding cannot accidentally remove a published-pair Windows lane.

### 2. Reuse canonical shard planning and evidence

Each publication Windows shard will call `run-validation-tier.mjs --full-shard` against the same canonical `full-release` plan used by standalone Full regression. The existing plan digest, assigned-work identity, shard recorder, and merger will remain the authority. No hand-authored publication scope lists will be accepted.

A Windows lane collector will download all expected shard artifacts for one runtime, reject missing, duplicate, stale, wrong-plan, cross-runtime, malformed, or unsuccessful evidence, and reconstruct one ordinary `a1-validation-outcomes-v1` result in canonical order. The merged artifact will retain the established `release-validation-<version>-<platform>` identity used by failure summaries and candidate inspection.

The workflow job currently referenced downstream as `validate` will become an aggregate over sequential lanes, Windows shards, and reconstructed Windows lanes. That keeps publication/result policy centralized: candidate and nightly require aggregate success, stable requires the same intentional skip, and no shard can independently authorize publication.

### 3. Keep shard workspaces isolated and validate the one candidate artifact

Every shard receives a fresh hosted runner, checks out the exact selected source, installs dependencies, builds once, and records its own build receipt. Each downloads the package pair produced once by the existing package job and binds those bytes to its local build receipt before execution. This repeats immutable setup but shares no `node_modules`, test roots, processes, or mutable package prefix between runners.

Only the package shard prepares the exact package installation, enables Defender, executes startup/package contracts, and uploads startup evidence. Core, resource, and rendering shards do not prepare an unused global package. The package shard uses the already downloaded stable-version candidate rather than repacking source, preserving the candidate workflow's exact-byte contract.

A common cross-job build or installed-package artifact is rejected because it would require new native/dependency integrity and mutable-prefix authority. Repacking inside each shard is rejected because candidate validation must test the one package artifact that final publication may adopt.

### 4. Share the verified candidate installation with the predecessor owner

The canonical plan will add `update-predecessor` as an authorized consumer of the one exact-package preparation already required by package startup and package contracts. Before the predecessor invocation, `runTierPlan` will perform the existing full receipt, candidate digest, lane, installed identity, and consumer verification; it will repeat identity verification after the invocation before cleanup.

The predecessor test will read the verified prepared package root through the bounded runner handoff instead of calling npm for the candidate tarball a second time. It still reads and checks the exact candidate tarball identity, and no ordinary direct test invocation without the authenticated handoff may substitute an arbitrary installed tree.

Cross-run or cross-runtime installation reuse is rejected. The prepared root remains private to one package shard and is removed by the existing exact-package cleanup path.

### 5. Install the immediate predecessor once and exercise it twice

The newest selected published predecessor already runs first in the three-release materialization/warmup loop. Its npm-installed private prefix will remain fixture-owned and unmodified after that compatibility assertion instead of being discarded immediately. The later Windows direct protected-replacement case will consume that same exact installed tree, mutate it through the predecessor's real replacement path, verify activation and command execution, and then discard it.

The other recent predecessor roots continue to be discarded after their materialization/warmup checks. The historical `0.2.2` bridge retains its own separate npm installation because it is a distinct immutable package and scenario. If earlier assertions fail, fixture teardown still owns and removes every retained root after active commands settle.

Cloning an installed tree, replacing npm installation with manual extraction, sharing dependencies through links, or running npm installs concurrently is rejected: those options change installation topology or reintroduce Windows filesystem contention. Retaining the exact already-installed prefix removes only duplicated setup.

### 6. Preserve diagnostics and timing authority

Shard uploads remain unconditional and include owner outcomes, package receipts, phase logs, startup evidence where applicable, shard identity, and canonical-plan digest. The lane collector and final publication summary will continue reporting failed owner commands under the canonical Windows runtime while retaining shard identity in job names.

Predecessor evidence will continue recording candidate/predecessor installation, materialization, warmup, discard, replacement, and cleanup phases. Focused policy tests will prove the candidate is not reinstalled, the newest predecessor has one npm install but both required behaviors, the bridge remains separate, and every selected predecessor still executes its own release code.

## Validation Matrix

| Layer | Required evidence |
| --- | --- |
| Matrix planning | Development keeps three sequential Node 24 lanes; candidate/nightly keep Linux/macOS sequential and schedule four shards for Windows Node 22/24; complete post-publication lanes remain unchanged |
| Canonical ownership | Every full-plan command and invocation belongs to exactly one existing shard and publication uses the same plan digest |
| Shard execution | Core, resource, rendering, and package jobs use isolated runners; serial partitions remain serial; no retry or continue-on-error path exists |
| Package authority | Every shard binds the one downloaded candidate; only package prepares an installation and enables Defender before startup |
| Lane reconstruction | Missing, duplicate, stale, malformed, wrong-runtime, wrong-plan, cancelled, or failed shard evidence cannot produce a successful Windows lane or aggregate |
| Predecessor setup | One verified candidate preparation serves startup, contracts, and predecessor consumers; immediate predecessor is npm-installed once; `0.2.2` remains independently installed |
| Predecessor behavior | Three recent predecessors still materialize/warm; Windows direct and bridge replacement still establish launcher, activation, and callable-command postconditions |
| Delivery timing | Candidate validation reports shard overlap, each Windows runtime's elapsed wall time, runner-minute trade-off, and remaining package critical path |

## Risks / Trade-offs

- **More Windows runner minutes.** Four isolated jobs repeat checkout, dependency install, and build per runtime. Exact shard timing will expose the cost; the trade is intentional wall-clock reduction without mutable sharing.
- **The package shard remains longest.** Real predecessor npm installations are still expensive. Removing the duplicate candidate and immediate-predecessor installs should shorten it, but no target duration is assumed before exact candidate evidence.
- **A retained predecessor root could leak or be mutated early.** Fixture ownership, sequential test order, explicit retained-root identity, post-use discard, and failure-path teardown prevent unowned reuse; tests will reject a second install or a substituted version.
- **Publication aggregation becomes more complex.** Existing canonical digest/merge machinery, exact artifact naming, complete-union checks, and a single downstream aggregate make orchestration omissions fail closed.
- **Matrix outputs serve two purposes today.** Separate validation and post-publication matrices prevent a sharding optimization from silently reducing published-pair smoke coverage.

## Migration Plan

1. Add focused exact-package consumer and predecessor-fixture tests before changing the exhaustive scenario; prove duplicate setup is removed without changing selected versions or assertions.
2. Extend publication matrix planning and workflow policy tests, then introduce Windows shard and lane-collector jobs using existing canonical evidence.
3. Keep the downstream validation job identity as the aggregate and reconcile every publication/result condition and failure-summary artifact pattern.
4. Run focused validation-tier, predecessor fixture, matrix, shard evidence, workflow policy, governance, typecheck, and strict OpenSpec checks; do not run local full or release suites.
5. Let exact-head CI validate ordinary affected scopes. After integration, the next candidate/nightly full run supplies native shard overlap and elapsed-time evidence; any missing shard, behavior failure, or non-improving unexplained bottleneck remains visible rather than being retried or waived.

Rollback uses a later corrective PR restoring monolithic publication Windows jobs and separate candidate installation while retaining every runtime, owner, and exact-package assertion. No partial shard result or retained fixture root may be treated as successful during rollback.

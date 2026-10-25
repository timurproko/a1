# Validation ownership and evidence

Development validation computes one exact base/head selection with:

```bash
npm run select:validation-impact -- --base <full-base-sha> --head <full-head-sha> --output .artifacts/validation/impact.json
```

The versioned `config/validation-ownership.json` registry maps stable product and test path groups to a mandatory PR core, an explicit critical floor per owner, changed and bounded transitive consumers, resource-sensitive tests, and integration owners. The coarse owners are UI/rendering, launch/startup, release/package/update, Pi, native containment, image/history, governance, and shared product inputs. Each integration owner in `config/integration-owners.json` declares `pull-request`, `direct-impact`, or `exhaustive` cadence. A changed pull-request test selects its owner; a changed exhaustive test selects focused deterministic contracts and records the exhaustive owner as cadence-deferred. Shared support selects every declared PR consumer and records affected exhaustive consumers; copies, renames, and deletions inspect both identities. Reasons and changed paths are recorded in `impact.json`.

Reviewed `refinements` can narrow a coarse owner's tests and integration links for known subareas: scrollbar/settings, clipboard/editor/repository commands, documentation/cleanup/delivery governance, and development-environment tooling. Each rule keeps an explicit minimum test set; a bounded relative-import graph across `test/`, `src/`, `scripts/`, and `bin/` adds at most 24 sorted transitive consumers per changed path, including consumers outside the coarse owner, and integration owners of those retained consumers. The graph is supplemental, not sole coverage authority. Unreviewed or absent source identities and an unavailable graph retain the coarse owner. Changed tests, shared support, and mixed source/support changes retain their coarse contracts; rename and deletion classification still includes both identities. Some UI changes deliberately select more tests than before because the graph exposes formerly missed shell consumers.

Unknown operational inputs, unavailable comparison history, workflow/selector/suite/aggregate changes, and manual Development dispatch select every coarse owner's critical floor and only integration owners with `pull-request` cadence. Direct-impact owners require a changed declared test, support, or production surface; exhaustive owners remain deferred. Missing, malformed, or unknown cadence blocks instead of guessing. Documentation-only and version-only changes retain explicit exemptions. An implementation-bound association (an `openspec-implementation` link in the PR body) only disables those two exemptions: the PR core still runs, and owners are still selected by impact rather than forced to conservative coverage. Selection does not require whole-repository source parsing.

The `changes` job then derives the modular job matrix from that same selection through `scripts/release/validation-matrix.mjs`, which declares every Development modular job and returns only the entries the selection activates; GitHub never schedules an inactive entry, so an ordinary PR does not spend runner minutes on jobs that would resolve to nothing. The matrix uses fail-fast cancellation, so a decisive failure stops remaining cells while missing or cancelled selected evidence still blocks the aggregate. Each scheduled job still resolves its own owners from the uploaded impact artifact, and the aggregate still requires evidence for every selected owner, so an entry that should have run and did not fails the run.

## Commands and coverage levels

The public complete commands remain unchanged:

```bash
npm run test:pr-core               # mandatory type/architecture checks and bounded smoke tests
npm run test:fast                  # typecheck, changed docs, complete fast composition
npm run test:scope -- <scope...>   # named atomic scopes
npm run test:full                  # complete deduplicated local composition
npm run test:release               # release gates; publication authority is unchanged
```

Before a push, run only quick targeted checks of what changed; CI after the pull request becomes ready is the validation authority:

```bash
npm run typecheck                          # type check
npx vitest run <changed test files...>     # tests covering the changed code
npx openspec validate <change> --strict    # the OpenSpec change
```

Do not run preflight, `test:fast`, `test:full`, `test:release`, or directory-wide test runs before pushing. They are for reproducing a failure CI reported, or when the maintainer asks. Preflight is the optional tool for reproducing a fast-gate failure:

```bash
npm run preflight                  # pull-request validation's fast gates on the committed head
```

Preflight selects the committed merge-base diff with `origin/develop` exactly as validation does (uncommitted paths are reported, not checked), writes it to `.artifacts/validation/local-impact.json`, and stops at the first failure. It runs the core job's install build and receipt, `typecheck`, `check:architecture`, changed-file code documentation, release documentation, changed-file naming, docs governance, strict OpenSpec validation with the workflow's pinned validator, the delivery-guidance test, and the core job's `pr-core-tests` and `pr-selected-tests` scopes. Each step invokes the script and arguments its workflow job runs, so a failure reports the same rule identifier and path. It never builds the native host, does not run resource-sensitive or integration owners, and CI remains the authority.

`test:pr-core` is not a replacement for `test:fast`: CI combines it with directly changed and coarse-owner tests from the exact impact selection. Selected resource-sensitive tests run independently on an isolated Windows runner. Selected package, startup, rendering, Pi, compatibility, and platform owners also run independently after their actual prerequisites.

Conservative Development retains every critical owner floor and the small set of `pull-request` integration owners, while scheduling only directly affected `direct-impact` owners and deferring all exhaustive owners. The complete regression implementation runs inside a PR only when base policy verifies an `openspec-ci` App-created repair, its generated candidate identity, and a failed Full regression source in `regression-provenance.json`. Publishing/prerequisite/validation-authority impact, shared inputs, unknown paths, labels, Publish-only repairs, and successful-run persistent-overrun candidates retain bounded ordinary validation. Planning-only generated repair drafts stay exempt; eligible implementation drafts get feedback without integration authority. The selected exact-head evidence must include Windows Node 22/24, Linux Node 24, and macOS Node 24. Full regression and nightly/stable release retain both cadence classes and the same coverage through the shared implementation. The real three-release `update-predecessor` exact-package oracle is exhaustive; deterministic predecessor command, fixture, materialization, warmup, package, and update contracts remain PR-eligible. Preview and release continue to consume exact candidate bytes under their channel-specific contracts. A standalone manual Full regression remains useful for diagnosis or an unselected candidate, but never replaces automatically selected current-PR evidence. The generated ownership ledger command is:

```bash
node scripts/release/generate-validation-ownership-ledger.mjs --output .artifacts/validation/ownership-ledger.json
```

Containment-selected modular jobs build and test the debug `process-guardian.node` addon for their exact platform, export `A1_PROCESS_GUARDIAN_PATH` to that file, and run the launch-owner integration fixtures as Node processes. The tests exercise the real addon-held Windows job or Unix process group, addon-backed identity and terminal operations, and the Node exit watcher; no fixture invokes a process-guardian executable. The Windows startup lane keeps Defender real-time protection enabled while packaged startup loads the release addon.

The `terminal-host` owner is CI-only. A change under `native/terminal-host/` or to its run scripts selects, per platform (Windows x64, Linux x64, macOS arm64), one **Native terminal host** job and three **Native terminal host tests** partition jobs. The partition jobs each build the test profile and run one third of the serialized `role_integration` suite (`run-terminal-host-probe.mjs --partition <i>/3`, partitioned by sorted test name read from the suite's source); the feature-gated `role-host` binary stands in only for the fixed role grammar inside Rust integration tests and is never packaged. The build-and-probe job runs `npm run test:terminal-host` with the role suite skipped (`TERMINAL_HOST_PARTITION=none`), building `terminal-host.node` with Rust, Node-API 9, and Zig 0.15.2 for the lane's exact target and baseline CPU model. It loads the addon for its version and non-interactive probes, verifies the shared session-writer lock export, and uploads the debug addon and frozen protocol manifest; Linux also runs bounded decoder fuzzing.

The protected aggregate requires every partition of every selected platform, keyed by `partition` in the outcome authority and job envelope. Because the role suite no longer warms the resident launch paths in the build-and-probe job, its certification step runs one unmeasured `measure-resident-tabs.mjs` pass before the measured pass whose budgets are unchanged. Fidelity, latency, chaos, and certification start roles as `process.execPath dist/foundation/resident-tabs/host-entry.js` with `A1_TERMINAL_HOST_PATH` naming the addon. Windows cleanup identifies those Node-hosted residents by command line; it never kills every `node.exe` by image name. Locally, `npm run test:terminal-host` without a partition is unchanged and runs everything in one process. Local Windows builds fail in `build.rs` unless `TERMINAL_HOST_LOCAL_BUILD=1` is set, because Zig's package fetch unpacks test data that workstation antivirus quarantines. Native lanes also publish the terminal library they linked; a local build can link it instead of running Zig (see Local native iteration in [`architecture/resident-tabs.md`](architecture/resident-tabs.md)), which is development evidence only and never replaces selected CI. `TERMINAL_HOST_CONTRACTS_ONLY=1` is a library-only diagnostic and cannot substitute for selected CI. See [`native/terminal-host/README.md`](../native/terminal-host/README.md).

## Coverage-preserving efficiency

Complete regression selects the full rendering scope instead of also executing its superseded smoke files. Full captures call the same smoke assertions, including independent producer identity, readiness, semantic parity, synchronization, and bounded paint checks. Smoke-only corrupted-evidence controls live in an ordinary deterministic test. Scheduled content runs once in each gate through the same owned-versus-pinned helper. The retained full matrix has 11 streaming workloads across three producers and two modes, two scheduled-content workloads across two producers, and six input workloads batched across three producers: 73 matrix launches plus 10 protocol-failure launches. Standalone smoke retains 19 launches. Full regression avoids the additional 19 smoke launches; it does not remove a workload or platform lane.

The coverage ledger test reconstructs every full-plan invocation and requires each retained file exactly once, except the two smoke files whose executed replacement contracts it names explicitly. Unit, shell integration, source/emitted entries, independent pinned parity, security/race controls, and runtime-specific tests are not interchangeable merely because they touch the same module.

The package-command transcript fixture uses four file-owned producer processes (owned/pinned times color 0/1), rather than starting 22 equivalent loaders. Every request still runs the real command with its independent home/settings and fresh transcript; failed producers are never restarted. Fresh-home isolation and process disposal are tested. Cold-entry contracts elsewhere retain their cold process boundary. Git cleanup scenarios still initialize their own real repository/worktree, but write private Git configuration once instead of launching four config/remote commands. Release fixtures create baseline refs in one real atomic ref transaction. Setup remains inside the owning scenario and no mutable fixture repository is shared.

Exact-package identity walks hash each payload as it is read, retain only file digests, and parse the manifest from that same walk. They keep the original digest contract, all pre/post consumer verifications, fresh prefixes, and separate shard installations. This removes duplicate manifest reads and full-payload buffering; it does not cache verification results or promise a material improvement to npm installation time.

Generate a content-free per-file inventory and optional observed timing report from an existing Actions run and log:

```bash
node scripts/release/validation-cost-report.mjs --run .artifacts/agent/completed-run.json --log .artifacts/agent/job.log --output .artifacts/validation/cost-report.json
```

The run JSON is the output of `gh run view RUN --json jobs,headSha,createdAt,updatedAt`; the log is from that same run's chosen job. Omit both inputs for inventory only. Reports are observational, never validation receipts. They identify source drift, each retained file's coarse owner/execution class, job and step duration, total runner time, longest job, workflow elapsed time, and runner span. Queue and DAG critical-path timing remain unavailable rather than guessed. File timings preserve repeated observations; never add concurrent job/file durations and call the result elapsed savings. Compare comparable completed runs before claiming a hosted speedup. No passing outcomes, installed trees, or mutable fixture state may be cached by these optimizations.

## Windows Full regression shards

Standalone and PR-attached Full regression run each Windows runtime (Node 22 and Node 24) as five hosted-runner shards derived from the one canonical `full-release` plan: `core` (command gates and the bounded-parallel ordinary remainder), `resource` (the serial resource-sensitive invocation with its unchanged explicit bound), `rendering` (the serial isolated rendering invocation), `package` (packing, its own exact-package installation, Defender-backed first-attempt startup before package contracts, package smoke, and update timing), and `predecessor` (packing, its own exact-package installation, and the exhaustive published-predecessor invocation, which took 11 to 12 minutes of the former package shard on Windows). Each shard checks out, installs, builds, and records its own build receipt; the package and predecessor shards each pack and install their own candidate, and no installed state crosses shards. Linux, macOS, local `npm run test:full`, and the sequential publication lanes keep one complete plan with one shared installation.

```
node scripts/release/run-validation-tier.mjs --full-shard <core|resource|rendering|package|predecessor> --result <path>
```

`partitionFullRegressionPlan` assigns every canonical command and Vitest invocation to exactly one shard and rejects unknown or duplicate work; the build is the only per-shard prerequisite. Each shard result carries its shard identity, assigned work, and the canonical-plan digest. A per-runtime collector job reconstructs one ordinary `a1-validation-outcomes-v1` result only when all four current-run shards for the exact source, runtime, run, attempt, and plan passed and each reported exactly its assigned work; the reconstructed result then binds the unchanged `windows-2025-node22` or `windows-2025-node24` lane, and the required aggregate still demands exactly four lanes. The collector's summary reports each shard's time and the elapsed span across overlapping shards. Nightly triage maps a failed shard's owners to the canonical Windows lane and names the shard job, and it rejects more than one startup evidence file for a lane.

## Failed-job reruns and attempt evidence

Every modular outcome, content-free job envelope, and uploaded artifact name is qualified by `github.run_attempt`. Authority remains bound to the workflow run ID, exact head, complete selection identity, logical job, and platform/runtime target.

For GitHub's explicit **re-run failed jobs** action, a successful job that GitHub did not rerun may be reused only from an earlier attempt of that same run/head/selection. A job executed in the current attempt must use its current outcome; failure, cancellation, malformed evidence, duplicate authority, or missing evidence blocks the aggregate. No result is reused across commits, workflow runs, or changed selections. The aggregate lists each reused job and original attempt. Workflows do not automatically retry semantic assertions or performance failures.

## Receipts and artifact boundaries

Checkout-bound type, architecture, governance, unit, and smoke outcomes bind head/run/selection/scope authority without inventing package identity. Build and package receipts remain mandatory wherever validation consumes emitted or packed bytes: package, startup, update, compatibility, preview, release, and publication boundaries.

A build receipt binds checkout head, complete build inputs, toolchain, emitted files, and native artifacts. A package receipt additionally binds exact tarball bytes, packed entries, manifest/bin identity, producer, and verified build/source authority. `VALIDATION_BUILD_READY` and `VALIDATION_CANDIDATE_TARBALL` only locate prerequisites; stale or tampered receipts cause fresh preparation or failure.

Npm download bytes may be reused with integrity checks and `--prefer-offline`, with normal network fallback. Every installation prefix remains fresh. Installed package trees, dependency certification, startup/profile state, mutable fixture repositories, passing outcomes, and publication evidence are never restored from caches.

## Shared exact-package preparation

A publication or Full regression lane installs the exact candidate once and shares that installation between `package-startup` and `package-contracts`. The installation is a separate command from the one that runs those owners, so the workflow can change runner state in between:

```
node scripts/release/run-validation-tier.mjs --prepare-exact-package --handoff <path>
node scripts/release/run-validation-tier.mjs --exact-package-handoff <path> --result <path>
```

The preparing command verifies the existing build receipt and the package receipt for the exact candidate, installs once, and writes an `a1-exact-package-handoff-v1` document with its consumers, prepared paths, measured duration, and verified receipt. The receipt's `preparation.phases` splits that duration into `installMs` (the npm global install), `proxySynchronizationMs` (the pi-tui proxy repair), and `installedIdentityMs` (the installed-package identity walk); on hosted Windows runners the install phase is the cost, because npm writes roughly 13,000 dependency files there. It runs no other planned command, so Full regression's real work is not executed twice.

The consuming command re-verifies that handoff against the lane, candidate digest, installation policy, declared consumers, and installed bytes before any owner runs, and records the result as `verified-shared-preparation`. A malformed handoff, one that contradicts the plan, or one that fails verification produces a single failed `exact-package-preparation` outcome and stops the run; it never falls back to a second installation. Removing the prepared installation stays with the consuming command either way.

Without `--exact-package-handoff`, preparation stays lazy and bound to the first consuming invocation. Local runs and ordinary pull-request CI are unchanged.

This split exists so Windows Defender real-time protection can be enabled between installation and the gates that launch the packaged product. Dependency installation and candidate extraction run in the runner's default protection state; the `defender-prerequisite` phase inside the startup gate remains the authority that protection is on when the product actually launches. To roll back, put the Defender step before `npm ci` again and drop both flags; do not remove the phase check or the receipt verification.

## Startup budget enforcement

The exact-package startup gate always measures both profiles and all three launch kinds on the first attempt and never retries a measurement. `STARTUP_BUDGET_ENFORCEMENT` decides only what a timing overrun does in the run that measured it:

| Value | Where | Effect |
| --- | --- | --- |
| `record` | Full regression, nightly and development publication (`publish.yml` on channel `next`), and the pull-request `startup` group in `ci.yml` | Keeps the measurement, appends the violation to the evidence, emits a `::warning::` annotation, renders the run-summary table, and lets the run succeed. |
| `fail` | Stable candidate validation (`publish.yml` on channel `latest`), whose validated bytes stable publication adopts | Throws the same message as before, so the draft cannot be published from that run. |

Any absent, empty, or unrecognized value means `fail`, so a local run and a misspelled channel both keep enforcing. A launch that records no input-ready frame fails in either mode, because that is a functional failure rather than a timing observation.

One hosted Windows sample is noise: the same bytes measure 1.2 to 2.7 seconds against 2.0 and 2.5 second budgets, and about 7% of single samples overrun. A recording channel is therefore judged by the persistent-overrun verdict in `scripts/release/startup-budget-trend.mjs`: for each Windows lane, profile, and launch kind, the startup evidence of the current run and the two previous completed `develop` runs of the same workflow are compared with the budget, and the key is regressed only when all three overran. Fewer than three samples is insufficient evidence, never a regression. The nightly regression triage computes the verdict on every completed `develop` run, green or not, opens or refreshes a fix candidate keyed by `package-startup` with the three-run table as evidence when it is persistent, and otherwise records `startup: single overrun on <keys>, not persistent` or `startup: within budget` in its report and run summary.

`STARTUP_PERFORMANCE_RESULT` names the `a1-startup-performance-evidence-v1` file. It carries `enforcement`, `budgetViolations`, and one measurement per profile and launch kind with its `elapsedMs` and `budgetMs`. Publication lanes upload it as `release-validation-<version>-<platform>` next to the tier outcome and render it as a table in the run summary.

The budget numbers themselves live in one place, `src/foundation/startup/startup-budget.ts`, and are declared by the `a1-shell` capability. Do not restate them in a workflow.

To make a channel enforce budgets on a single sample again, set `STARTUP_BUDGET_ENFORCEMENT: fail` in that workflow's validation step; rollback must not remove the measurement, the evidence fields, the evidence upload, or the trend verdict.

## Evidence inspection

Download these artifacts from the exact workflow run:

- `development-validation-impact`: base/head, global selection identity, PR-core tests, selected pull-request owners, cadence-deferred exhaustive owners, exclusions, and bounded reasons.
- `development-validation-outcome-<job>-<platform>-node<node>-attempt-<attempt>`: attempt-qualified outcome, content-free envelope, per-scope authority and duration, and applicable exact-artifact evidence.
- `development-validation-aggregate-<head>-<run>-<attempt>`: selected/deferred owners, accepted/reused attempts, evidence count, runner critical path, total runner time, aggregate processing, setup/gate/scope time, cache state, and invocation count.
- `pr-full-regression-selection-<run>-<attempt>` plus `complete-regression-aggregate-<run>-<attempt>`: current PR/head/base/metadata selection identity and all four exact-run native lane envelopes. Missing, mismatched, stale, failed, cancelled, or unexpected skip evidence blocks the protected aggregate. It reports the eight-minute critical-path and five-minute individual-scope targets as met or unmet; hosted queue delay is not test execution and remains separate.
- startup/resume phase JSONL and performance JSON: first-attempt launch evidence and retained failed setup/readiness records.

For selected implementation candidates, record focused and pre-finalization full observations before finalization. Keep final head/run/selection identity in Actions and handoff rather than adding a post-success commit that invalidates that evidence. A successful selected PR run replaces an additional mandatory dispatch; standalone runs remain diagnostic, and numbered-package nightly recovery remains independent.

Draft pull requests run no Development test suites. A ready version-3 PR whose body still identifies an active change defers testing and emits no protected aggregate while `OpenSpec finalization` publishes the candidate. A ready unassociated PR also fails closed when immutable base/head evidence shows that it introduces or restores active delivery content, or combines active-change edits with code or operational paths; it does not fall through to ordinary validation merely because its body fence is absent. Existing active-change documentation-only revisions and ordinary code PRs without active delivery paths retain their established routes. After finalization records the archive and acceptance manifest, the ordinary exact-head workflow runs selected product/governance lanes and `Finalized delivery validation` in parallel, then emits the stable protected `Development validation required` aggregate only when both authorities succeed. Green CI enables maintainer review and an explicit integration decision but does not claim human acceptance or merge automatically. After green exact-head validation, the maintainer may directly merge, personally arm native auto-merge, or explicitly ask the active agent to perform one expected-head protected squash merge for that currently eligible candidate. The finalization fence update is the validation trigger, so no pre-finalization test run or later lifecycle body edit is required. Any subsequent eligible implementation commit changes the head and reruns applicable validation; any body change reruns readiness and finalized-record validation and must continue to match the committed manifest. Legacy acceptance-record-only PRs retain their separate trusted `Acceptance record validation` route. Queue availability remains explicitly unavailable inside a runner and is calculated from the Actions API during final run analysis rather than guessed.

## Rollback

To disable selective execution without reducing PR coverage, use manual Development dispatch or force conservative ownership selection. To restore the historical predecessor oracle to every applicable PR, change its cadence from `exhaustive` to `pull-request`; do not delete it from Full/nightly/release. To disable prior-attempt reuse, require all accepted attempts to equal the aggregate attempt; this must not remove attempt-qualified artifacts or failure visibility. To disable prerequisite reuse, unset readiness/tarball variables and receipt paths so tier orchestration rebuilds and repacks.

Rollback must retain complete Full/nightly/release test coverage, startup budgets, zero automatic retry policy, required release platform/runtime lanes, exact-package identity, resource isolation, and the single stable protected-branch aggregate. It must not restore owner-wide or unrelated exhaustive execution to ordinary pull requests.

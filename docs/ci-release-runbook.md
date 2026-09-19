# CI and release operations

GitHub Actions is the only automation platform. Three refs are protected:

| Ref | Protection | Produced by |
| --- | --- | --- |
| `develop` | `Development validation required` on every pull request | `.github/workflows/ci.yml` |
| `master` | cannot be deleted or force-updated | stable publication |
| `refs/tags/v*` | cannot be deleted or moved | stable publication |

`.github/workflows/release.yml` is the only publisher. A push publishes neither
channel. The workflow starts at `03:17 UTC` for nightly development verification,
or by explicit dispatch from `npm run develop` or `npm run release`.

`.github/workflows/documentation-auto-merge.yml` is the only pull-request
auto-merge authority. It runs trusted policy from `develop`; it never checks out or
executes a pull request's code with its write token.

`.github/workflows/merged-branch-cleanup.yml` owns branch deletion after a human or
external actor closes a pull request. On the close event it checks out trusted
default-branch policy and installs no pull-request dependencies. GitHub does not
emit a new workflow event for a merge authored with the workflow `GITHUB_TOKEN`, so
Documentation auto-merge also performs the same shared reconciliation synchronously
after its own validated integration. Both paths delete only an unprotected same-
repository topic ref whose live object still equals the merged pull request head SHA.
An absent ref is success; fork, unmerged, advanced, protected, default, release-owned,
or malformed refs are preserved and reported.

`config/github-repository-governance.json` is the reviewed policy for repository
settings, Actions defaults, security capabilities, environments, complete rulesets,
protected refs, and workflow authority. Inspection is read-only by default:

```sh
node scripts/governance/check-github-repository-governance.mjs --check
```

Applying reviewed mutable drift is a separate maintainer operation requiring
`--apply --confirm apply-a1-github-governance` and a matching post-apply read.
Secrets and external npm trusted-publisher configuration are capability checks, not
serialized credentials.

`develop` is where work lands. `master` records what npm `latest` serves and is an
effect of stable publication, not a trigger.

## Validation by trigger

| Trigger | Validation and outcome |
| --- | --- |
| Pull request into `develop` | Bounded PR-cadence validation; changed/new source documentation is checked once, rendering runs as `none`, `smoke`, or `full`, and exhaustive owners are reported as deferred |
| `npm run develop` | Preview package gates on Windows, Linux, and macOS; an existing numbered preview is an early successful no-op |
| Nightly at `03:17 UTC` | One full documentation review plus the complete non-physical suite on Windows, Linux, and macOS, every night |
| `npm run release -- ...` | Complete exact-byte stable gates, then npm `latest`, tag, GitHub Release, and `master` |
| `.github/workflows/full-regression.yml` | Additional on-demand complete regression without publication authority |
| `.github/workflows/pi-upstream-sync.yml` | Nightly at `03:23 UTC`: when npm publishes a newer Pi than the pin that no closed proposal skipped, proposes the upgrade as a draft pull request with the vendored copies that follow upstream merged, the kept copies reported with their upstream delta, the ledger, headers, inventories, public API and feature baselines, startup graph, and parity evidence regenerated, and every gate verdict (passed, failed, or blocked by conflict markers) and review item in the body; never merges and never replaces a proposal a human has continued |
| `.github/workflows/nightly-regression-triage.yml` | After a failed `Full regression` run on `develop` or a failed scheduled `Release` validation: opens `fix/nightly-regression-<date>` as a draft pull request carrying the failed commands per lane, their tests, a bounded log excerpt, the `develop` commits since the last green run, and an OpenSpec fix scaffold, or refreshes the open candidate with the same failed scope set; re-runs nothing, never writes `develop`, never merges |

## Impact-aware development validation

`scripts/release/select-validation-impact.mjs` is the single pull-request selector. It records the complete merge-base-to-head name-status diff, changed/new documentation inputs, rendering dependency reasons, conservative fallbacks, and the exact head SHA in a machine-readable artifact. Missing history, unresolved rendering dependencies, unknown relevant inputs, or classifier failure select full rendering rather than silently skipping it.

Ordinary type, architecture, unit/contract, and dist checks always run for code changes. Changed-file documentation and rendering run as independent parallel jobs. Rendered shell/component changes select `smoke`; viewport, scheduler, terminal adapter, evidence harness, package identity, and selector changes select `full`; unrelated changes select `none`. The aggregate accepts a skipped modular job only when the current selector requested the skip.

Integration owners declare one cadence in `config/integration-owners.json`. Impact mode selects affected `pull-request` owners: a changed production path selects its coarse owner, a changed test selects its owner, and a changed file under `test/support/` or `test/fixtures/` selects the owners of the retained tests that import it directly or through other support files (the selection lists those tests as its `shared-support` reason). A support file that no retained test imports, or a test tree the scanner cannot read, falls back to every owner the shared rule declares and records `shared-support-declared`; an invalidator, unknown operational path, or manual Development dispatch selects every `pull-request` owner. An implementation-bound PR body does not force conservative selection; it only removes the documentation-only and version-only shortcuts. The modular matrix itself is derived from the selection by `scripts/release/validation-matrix.mjs`, so inactive jobs are not scheduled at all rather than checking out and exiting early. `exhaustive` owners are never silently skipped or reported as passed: impact and aggregate evidence list them as cadence-deferred, and malformed cadence blocks selection. Full regression and nightly/stable release still execute both cadence classes.

The real three-release `update-predecessor` scenario is exhaustive because four fresh npm installations dominated recent PR critical paths, and `update-performance` is exhaustive because its assertion is wall-clock timing on a shared runner; the update path's deterministic contracts stay on pull requests through `pi-release-resume` and `package-contracts`. PR validation retains deterministic predecessor command, lifecycle, fault, fixture, materialization, warmup, package, and update contracts. This permits a real published-history incompatibility or update slowdown to reach `develop` before the next exhaustive run detects it. `.github/workflows/full-regression.yml` runs every night at `02:47 UTC` against the `develop` tip with every owner and enforced budgets, independent of publication, so such a regression shows as a failed Full regression run the next morning; nightly publication's own complete validation still blocks publication. For a high-risk release/update change, dispatch Full regression before merge instead of adding an exhaustive owner back to ordinary Development.

Development outcomes report each owner/scope invocation separately while sharing authenticated build/package preparation. The aggregate reports setup, scope, job, aggregate-processing, total runner, and runner-critical-path durations. The acceptance targets are at most eight minutes of runner critical path and five minutes for one PR-required scope; an over-target result remains unmet without retries, timeout increases, workload reduction, or mutable installation caches. Hosted queue time is reported separately when available and is not counted as test execution.

Inspect local committed and worktree impact without running tests:

```sh
npm run select:validation-impact -- --include-worktree
```

Check documentation only for modified, added, copied, and renamed-to policy files:

```sh
npm run check:code-documentation:changed
```

Run the explicit complete documentation review used by nightly and complete regression:

```sh
npm run check:code-documentation
```

Rendering evidence captures each selected producer/mode/workload matrix once and reuses it for semantic, paint, parity, and damage assertions. A deliberate second `streamed-prose` capture remains only for determinism. Workflow summaries separate repository-gate timing from runner setup; wall-clock values diagnose runner/cache variance, while selected scopes, matrix captures, producer launches, documentation file counts, and full-scan counts are structural gates.

## Resource-sensitive fast validation

The authoritative fast-tier declaration identifies tests that repeatedly create temporary repositories, launch child processes, mutate storage, or coordinate release cohorts. The planner removes those files from the parallel remainder and runs them exactly once in one serial `vitest-fast-resource-sensitive` process with file parallelism disabled, on an isolated runner that no other partition shares. One process instead of one per file removes about twenty cold starts from the partition; each file still gets a fresh module context. Pull-request, development-package, and complete release plans use the same partition on every platform.

The partition runs under an explicit `--testTimeout=30000`, the same hang bound the other explicit fast-tier invocations use. That bound is a hang detector, not a performance gate: shared Windows runners vary by a factor of two or more for identical work, and a fixed five-second wall-clock limit failed passing suites on runner noise. Per-test durations remain in the reporter evidence; `scripts/release/report-resource-sensitive-validation.mjs` records repeated executions and lists every test body above five seconds under `slowTests` so a real slowdown is visible without failing the pull request. A failure is still not retried or converted to success, and the bound is not raised to create margin.

Inspect the partition without running tests:

```sh
node scripts/release/run-validation-tier.mjs fast --plan
```

Record three focused serialized executions without running the complete fast tier:

```sh
node scripts/release/report-resource-sensitive-validation.mjs --repeats 3 --output .artifacts/validation/resource-sensitive-focused.json
```

## Pull request integration

`Development validation required` remains the merge gate for every pull request. For applicable code changes, it requires the dedicated Defender-enabled exact-package startup lane on Windows Node 22. Development validation (including manual dispatch) does not schedule a Windows Node 24 startup lane. The Node 22 lane retains the complete package-install, image preparation/package, and durable-history checks plus startup evidence artifacts. A missing, cancelled, failed, or unexpectedly skipped required startup result still blocks the aggregate; documentation-only, version-only, and draft exemptions are unchanged.

| Startup runtime | Development validation (PR or manual) | Development preview (`npm run develop`) | Nightly and stable publication | Manual Full regression |
| --- | --- | --- | --- | --- |
| Windows Node 22 | Required for applicable changes | Not scheduled | Retained | Retained |
| Windows Node 24 | Not scheduled | Retained | Retained | Retained |

Each selected startup lane runs the package-install scenarios once: a failed budget remains failed and is never retried to obtain a warmed result. The budgets are the ones the `a1-shell` capability declares (2 seconds after an update and on a warm launch, 2.5 seconds with no live supervisor); development validation and development previews record an overrun as a warning, while nightly, stable, and Full regression fail on it (see `STARTUP_BUDGET_ENFORCEMENT` in [validation](validation.md)). The publication lane set comes from `scripts/release/publication-validation-matrix.mjs`: a numbered preview validates on the Windows, Linux, and macOS Node 24 lanes, and nightly covers the same head on Windows Node 22 within a day. Node 24 runtime support, other PR jobs, Defender, and publication gates are unchanged. Full validation retains every deferred startup, image, and history test through its existing suite owners.

The trade-off is delayed detection: a Node-24-specific regression can reach `develop` before nightly catches it, and the same is true for a real published-predecessor regression. A green bounded PR check does not certify Node 24 or real historical predecessor execution, and nightly failure still blocks its publication. When deferred feedback is needed before nightly, explicitly request the non-publishing Full regression workflow for the desired branch or tag:

```sh
gh workflow run full-regression.yml --ref <branch-or-tag>
```

Record the run's resolved source SHA and package evidence; do not substitute an unrelated historical green run for current-head acceptance. This full run is a deliberate additional operation, not an automatic step for every PR.

Documentation auto-merge reads the complete GitHub changed-file response and arms
squash auto-merge for an eligible pull request while required validation is pending;
branch protection prevents integration until `Development validation required`
succeeds. If validation finishes before auto-merge can be armed and GitHub already
reports the pull request clean, the reconciler squash-merges only the validated head
SHA. Every current and renamed-from path must be under `openspec/**`, under
`docs/**`, or exactly the root `README.md`. Eligible pull requests must use a
non-draft branch in this repository and target `develop`. Implementation-associated PRs and newly introduced active OpenSpec changes are held for manual integration even when their diff is documentation-only. Body edits trigger reconciliation; removing a marker cannot bypass the base/head tree check. Standalone existing-change revisions and archive moves remain eligible.

The exact allowlist covers maintained OpenSpec, architecture, feature, manual,
runbook, and root README documentation. Other root Markdown files, `LICENSE`,
`.gitignore`, source, tests, scripts, workflows, configuration, generated baselines,
and mixed changes do not auto-merge. The guard also runs when a pull request changes
or auto-merge is manually enabled; if any path is outside the allowlist, it disables
auto-merge while leaving the pull request available for a later manual merge. Every
docs-only change runs lightweight generated-governance consistency, so archiving an
inventoried OpenSpec occurrence fails that pull request rather than a later code pull
request. The only narrower route is an exact single added canonical
`openspec/acceptance/<change>/<source-head>.json` record: trusted base policy reads the
complete live diff before dependency installation, then the dedicated acceptance job
must validate its exact source, CI, scope, branch, body, checklist, and conflict state.
Only that verified route skips generic impact installation and documentation/all-spec
validation; malformed, mixed, renamed, stale, or unavailable inputs fail closed.
A legitimate generated baseline update remains outside the allowlist and follows the
manually accepted mixed/code path.

A new implementation-bound specification starts as OpenSpec-only artifacts in one normally named draft PR. Explicit approval to implement continues in that same worktree, branch, history, and PR; the plan does not merge first. Approved refinements reconcile planning before code. After implementation, add one to three plain implementation-specific bullets under `## Acceptance` and mark the PR ready; the trusted `OpenSpec finalization` workflow conservatively synchronizes deltas, stages the dated archive plus conditional acceptance manifest, and commits them to the same branch, and exact-head CI validates that head. Auto-merge remains disabled: an authorized maintainer's manual merge accepts the listed scenarios and atomically integrates implementation, specs, and archive. No acceptance or archive follow-up PR is created. Closing an unmerged draft integrates nothing; cleanup still needs separate approval. See [delivery and archive handoff](openspec-archive-automation.md) for commands and legacy compatibility.

## Numbered development previews

A merge or push to `develop` does not publish by itself. To request a deliberate
preview from any authorized checkout:

```sh
npm run develop
```

The command fetches authoritative `origin/develop`, resolves the unique merged pull
request associated with that exact commit through GitHub, and derives
`<major.minor.patch>-dev.<pull-request number>`. Thus GitHub's `develop (#107)`
source produces `0.1.8-dev.107`. It first checks npm; if the immutable version
already exists it reports that version without dispatching package work. Otherwise
it dispatches GitHub Actions, waits, and reports the published version. It never
builds or uploads npm bytes from the workstation.

Nightly resolves the same current `origin/develop` source. It runs one platform-independent full documentation review before the platform matrix, and the matrix records that prerequisite instead of repeating the scan four times. It always runs complete verification even if source has not changed. For a new number it packs once and
runs the suite against that final-version tarball before publication. For an
existing number it downloads the exact npm tarball and runs package/update gates
against those registry bytes; publication is then a successful no-op.

Manual and nightly runs share one non-cancelling concurrency group. Their final
registry check is serialized, so overlapping requests can produce only one publish
and one successful existing-version no-op. A development publication moves npm's
internal `next` dist-tag and never moves `latest`.

Users install previews with public `develop` terminology:

```sh
a1 update --develop                     # current development channel
a1 update --develop 107                 # numbered preview
a1 update --develop 0.1.8-dev.107       # exact full preview version
```

The former `a1 update:<selector>` commands are removed without compatibility
aliases or redirects. Unsupported forms exit quietly without registry or runtime
work.

## Cutting a stable release

From the repository root on clean `develop` matching `origin/develop`:

```sh
npm run release -- patch     # 0.1.8-dev -> 0.1.8; already-stable 0.1.8 -> 0.1.9
npm run release -- minor     # 0.1.8-dev -> 0.2.0
npm run release -- major     # 0.1.8-dev -> 1.0.0
npm run release -- 0.4.0     # exact stable target
```

A target is required: `npm run release` alone is a mutation-free usage error.
`patch` preserves prerelease-aware semantics, including `0.1.8-dev.123 -> 0.1.8`.
The command reports its source, stable target, and prospective reopening before
preparing anything.

1. The stable-version edit is committed in an owned detached worktree beneath
   `.worktrees/`. Only this package's manifest and root lockfile version change.
2. Follow the printed PR URL, wait for required CI, perform local validation, and
   **merge manually after acceptance**. The helper does not merge PRs or enable
   auto-merge. It polls for actual merge with a bounded 30-minute wait.
3. The helper verifies the merged version and source SHA against authoritative
   develop, then explicitly dispatches stable publication for that exact source.
   A changed source is an error, not permission to substitute a newer commit.
4. Only after verified publication of `0.1.8` does it prepare a separate PR for
   `0.1.9-dev`. Validate and manually merge that PR as well. Until then the helper
   reports development reopening as incomplete.

Closed PRs, timeout, cancellation, and query failures retain identifiable phase
work for inspection. Conflicting existing branches/PRs are not overwritten;
matching pending PRs can be observed again without replacing them. Worktrees
retained by an earlier attempt are not removed by a later invocation. Cleanup
only removes clean, owned, confirmed-merged phase worktrees and unchanged remote
phase branches. The caller is never hard-reset: a final fast-forward is attempted
only when its branch, original HEAD, and cleanliness remain unchanged. Otherwise
preserve local work and synchronize manually with the reported remote state.

Stable publication builds the process guardian on all supported platforms, packs
once, runs the complete suite against those exact bytes on Windows, Linux, and
macOS, publishes to npm `latest` with provenance from the `npm-publish`
environment, and then writes `vx.y.z`, records the GitHub Release, and fast-forwards
`master`. A push of the stable version does not publish it.

Rules that do not bend:

- **Never upload locally rebuilt bytes.** The publisher uploads the artifact the validation ran against and checks its digest before and after.
- **Never route around validation by rebuilding inside a publisher.** The publish job receives the packed artifact and does not install dependencies, build, or pack.
- **Never move a release tag.** A wrong tag is superseded by the next version, not repointed.

## When something fails

- **PR validation fails:** fix the code and push; do not mark a failed PR-cadence tier optional. If real predecessor history is needed, run Full regression rather than changing the exhaustive result into PR success.
- **Nightly regression fails:** the triage workflow opens or refreshes a draft `fix/nightly-regression-<date>` pull request whose body and change carry the evidence; start the fix there. Reproduce from the listed tests or commands on the failed lane, fix without weakening assertions, budgets, timeouts, or coverage, then dispatch `gh workflow run full-regression.yml --ref fix/nightly-regression-<date>` on the completed fix head and record the run in the change's design evidence before hand-off; ordinary PR validation does not run the exhaustive owners the nightly failed on. A day whose failed scope set differs from every open candidate opens a new one. A Full regression dispatched on a candidate's own branch is that candidate's proof; its failures never open another candidate. A failure with no candidate means the triage workflow itself failed; read its run summary and dispatch it with the failed run id and `dry_run` off.
- **Nightly exhaustive predecessor validation fails:** treat the focused PR result as insufficient, keep publication blocked, and repair the incompatibility without reducing predecessor count, timeouts, or exact-package isolation.
- **Documentation auto-merge fails:** leave the pull request open, inspect its exact
  changed-file classification, docs-sensitive inventory, and workflow permissions,
  and never broaden the allowlist to make one pull request pass.
- **Merged-branch cleanup fails:** inspect the bounded PR/ref/SHA disposition. Never
  delete an advanced or protected ref merely because its name matches an old PR.
- **Repository governance drifts:** run the read-only checker, review every reported
  path, and use the confirmed apply mode only for an accepted mutable policy change.
- **A Pi upgrade proposal needs a re-run:** the sync never force-pushes over `chore/pi-<version>` once it carries a commit the bot did not author; a scheduled re-run posts its fresh verdicts as a comment headed with the version and date and rewrites only the report between the `<!-- pi-upgrade-report -->` markers of the description. To re-run the derived steps and gates on the reviewer's head, dispatch the workflow with `refresh` and the `version`; it checks out the proposal branch, skips bump, evaluation, install, and merge, and reports without pushing. A branch whose commits are all the bot's is recreated from `develop` as before.
- **A Pi version should not be adopted:** close its proposal pull request with the `pi-upgrade-skipped` label (declared in `config/github-repository-governance.json`) and say why in the closing comment; the next run proposes the newest unskipped version newer than the pin, or nothing, and names the skipped versions in its log. A proposal closed without the label is proposed again the next night. Dispatching the workflow with a `version` ignores skips, which is how a skipped version is reconsidered. To silence the schedule through a release window, set the repository variable `PI_UPGRADE_FREEZE_UNTIL` to a date (`2026-10-01`); scheduled runs exit before proposing until it passes, manual dispatches still run.
- **Nightly documentation review fails:** inspect the reported paths and rules, identify the introducing merge from the nightly interval, and repair the invariant before unrelated work proceeds.
- **Development publication fails:** fix the cause and rerun `npm run develop`; an npm version that already exists is never overwritten.
- **Registry verification times out:** a `has not propagated` failure after a successful `npm publish` means npm is still ingesting the upload; it warns that a provenance-signed package "may take a few minutes" and the publisher polls for ten minutes. Confirm the version and its shasum on `https://registry.npmjs.org/<name>/<version>`, then rerun the failed jobs: the final registry check finds the exact bytes, skips `npm publish`, and verification passes. A digest or tag mismatch is not a timeout and is never repaired by rerunning.
- **Stable preparation stops before dispatch:** inspect the reported version PR/worktree. After preserving work, an exact matching pending PR can be observed again. If develop already declares the prepared stable version, use its exact target (for example `npm run release -- 0.1.8`) only after verifying that source's merged PR and confirming the registry/tag guards still permit it. Do not use `patch` from stable develop to retry the same version: that deliberately selects the next patch.
- **Stable publication fails or is uncertain:** inspect the workflow, registry version/digest, tag, and release before choosing recovery. No reopening PR is prepared. Never republish immutable bytes or move a release tag.
- **Stable publication succeeded but reopening stops:** the stable version is already published. Inspect and finish the reported next-development PR manually; do not repeat stable publication. If no reopening PR was created, prepare the next-development version through a separately validated manual PR after inspecting remote state.

## Safe release-command validation

Use the isolated harness rather than a live release to validate changes to this command:

```sh
npm exec --no -- vitest run test/repository-governance/release-target.test.ts test/repository-governance/release-command.test.ts --maxWorkers=1 --minWorkers=1
```

It uses disposable local Git repositories and fake GitHub, registry, and publication
services. It does not publish a package or create production version PRs. A real
release remains a separate deliberate operation.

## Branch protection rationale

One person maintains this repository, and a PR author cannot approve their own PR.
The `develop` ruleset therefore requires a pull request, a green required check,
and resolved review threads, but zero approving reviews. `master` and release tags
are written only after publication and are protected from force-push, movement, and
deletion.

Do not add direct-push bypasses. Approval count, strict-base validation, repository
merge methods, Actions allowance/SHA enforcement, Dependabot, and npm environment
protection remain explicit maintainer decisions; governance automation does not
silently change them. Repository mutation remains a separate confirmed administrative
operation through `check-github-repository-governance.mjs`.

## ADDED Requirements

### Requirement: Reused validation setup and build caches retain exact identity
Validation SHALL avoid repeated successful builds and candidate packing within a job when the consuming scopes use unchanged source, platform, architecture, toolchain, dependencies, and build inputs. Reuse SHALL depend on verified prerequisite evidence and present artifacts rather than an unchecked environment flag. Missing or incompatible setup evidence SHALL cause fresh preparation or an explicit failure before tests, never successful validation with stale artifacts.

Persistent caches SHALL be limited to integrity-checked dependency downloads and compatible build tool caches, with validation of resulting artifacts after restoration. Clean-install gates SHALL still install exact candidate bytes into fresh private prefixes. Mutable installed fixtures, active releases, certification state, launch compile caches, and prior performance results SHALL not be restored as substitutes for current-head execution. Publication SHALL retain its existing pack-once and exact-byte authority.

#### Scenario: Installation already built the job's candidate
- **WHEN** dependency installation successfully builds the unchanged selected source and records compatible prerequisite evidence
- **THEN** later scopes in that job SHALL consume that build without rebuilding it

#### Scenario: A ready marker is stale or forged
- **WHEN** setup is marked ready but its inputs differ or required artifacts cannot be verified
- **THEN** validation SHALL rebuild or fail before consuming those artifacts

#### Scenario: A package download cache is warm
- **WHEN** a clean-install scenario can reuse cached dependency tarballs
- **THEN** it SHALL verify their integrity and install into a new isolated prefix
- **AND** first-attempt startup evidence SHALL not be replaced by warmed fixture or prior-run evidence

#### Scenario: A build cache is warm
- **WHEN** a publication build can reuse cached build tool state for the same toolchain and dependency lockfile
- **THEN** the locked release build SHALL still run and its emitted package identity SHALL still be recorded
- **AND** a changed source or lockfile SHALL rebuild the affected output rather than reuse a stale artifact

## MODIFIED Requirements

### Requirement: The complete suite remains available on demand

The complete non-physical automated suite SHALL remain runnable locally (`npm run test:full`) and through manual workflow dispatch, so a maintainer can widen validation when a change feels risky, and SHALL run on a nightly schedule against the current `develop` tip so exhaustive owners and enforced budgets are exercised every day independent of publication. Routine development SHALL NOT require it.

Standalone and selected PR-attached Full regression SHALL execute the complete Windows Node 22 and Node 24 coverage through reviewed parallel hosted-runner shards. Each Windows runtime SHALL have `core`, `resource`, `rendering`, and `package` shard evidence derived from one canonical complete plan. Every canonical command and test invocation SHALL belong to exactly one shard, and one successful Windows lane result SHALL be reconstructed only from all four exact-source, exact-run, exact-attempt, exact-runtime shard results. Missing, duplicate, stale, malformed, failed, cancelled, or unexpected shard evidence SHALL fail the applicable lane and required aggregate. Linux, macOS, local full validation, and publication validation MAY retain one sequential complete plan.

A scope that the complete-regression lanes cannot run MAY be excluded from the `full-release` plan only through an explicit `fullReleaseExclusion` reason on its definition in `config/validation-suites.json`. No scope is currently permitted such an exclusion; adding one SHALL require a reviewed change to this requirement that names the scope and its reason.

#### Scenario: Maintainer requests full validation

- **WHEN** the maintainer dispatches the full-regression workflow or runs the full tier locally
- **THEN** every non-physical scope without a declared `fullReleaseExclusion` SHALL execute and report per-scope timing and outcomes
- **AND** workflow-dispatched Windows coverage SHALL reconstruct each runtime lane from all four required shards while local validation MAY remain sequential

#### Scenario: Nightly schedule fires

- **WHEN** the scheduled Full regression runs
- **THEN** it SHALL validate the current `develop` tip with every pull-request and exhaustive owner whose scopes are not declared `fullReleaseExclusion`, and with enforced startup budgets
- **AND** its failure SHALL be visible as a workflow failure without changing publication authority

#### Scenario: Windows shard evidence is complete

- **WHEN** all four Windows shards for one runtime belong to the same exact source, canonical plan, workflow run, and attempt and every assigned outcome succeeds
- **THEN** validation SHALL reconstruct one complete result in canonical outcome order and bind it to the existing Windows runtime lane
- **AND** the protected complete-regression aggregate SHALL continue to require that lane alongside the other three platform/runtime lanes

#### Scenario: Windows shard evidence is incomplete

- **WHEN** a required shard is missing, duplicated, stale, malformed, cancelled, failed, belongs to another runtime or plan, or omits or duplicates assigned work
- **THEN** no successful Windows lane envelope SHALL be produced
- **AND** the final complete-regression aggregate SHALL fail closed with available shard failure evidence

#### Scenario: A scope is excluded from complete regression

- **WHEN** a scope definition declares `fullReleaseExclusion`
- **THEN** validation SHALL reject the definition unless this requirement names that scope as a permitted exclusion
- **AND** a permitted exclusion SHALL carry a non-empty reason and SHALL NOT be included by `full-release`

### Requirement: Publication follows from what was pushed
Publication SHALL use trusted workflows. It SHALL start nightly, by explicit
development dispatch, or, for stable npm publication, only when an authorized human
publishes the prepared source-bound draft Release through GitHub's native **Publish
release** control. A push, pull-request merge, pushed tag, draft creation, draft
edit or save, candidate validation success, unrelated CI success, and dispatch
payloads SHALL NOT publish stable npm packages. The maintainer SHALL NOT navigate to
Actions or re-enter the stable version.

Stable preparation SHALL require an explicit target bump or `x.y.z` not below the
source's open `x.y.z-dev` core, SHALL refuse an existing target tag or existing
target package version, and SHALL create or exactly reuse one unpublished draft bound
to the current authoritative `origin/develop` commit. A generated draft body SHALL
list every pull request merged on the first-parent history after the baseline: the
highest published, non-prerelease GitHub Release below the target version whose tag,
as resolved on `origin`, points at a commit in that history. Local tags SHALL NOT
select the baseline, and preparation SHALL fail when no such Release exists. It SHALL then start, or reuse a
running or successful, trusted default-branch candidate validation of that exact
source and stable version, and print the validation run URL. It SHALL then wait for
that run to complete. Only after the run succeeds SHALL it print the draft editing URL
and direct the maintainer to edit the changelog and choose **Publish release**; after
a failure it SHALL report the failed jobs and their reasons and SHALL NOT print the
editing URL. Each printed URL SHALL stand alone on its own output line. Interrupting
the wait SHALL leave the run going, and repeating the command SHALL resume waiting on
the same run.

The trusted publisher SHALL accept a dispatch wrapper by its default-branch workflow
identity and the caller's `workflow_dispatch` event, because a reusable workflow
observes its caller's event rather than `workflow_call`.

Candidate validation SHALL stamp the stable version on the bound source, pack both
packages with the draft's then-current note over committed history, and run the
complete stable suite on the exact bytes without publishing npm, uploading a Release
asset, or moving `master`. It SHALL retain that exact validated package pair with its
source identity as the candidate evidence stable publication adopts.

On `release.published` for a stable, non-prerelease Release, trusted code SHALL
derive the version from the tag and SHALL require the tag to be a lightweight tag at
the Release's bound source, that source to be in `develop` history, the publishing
actor to be a GitHub `User` with `write`, `maintain`, or `admin` permission, both
target package versions to be absent, and a successful candidate validation of that
exact source and version. It SHALL snapshot the bounded normalized published body
and adopt the package pair retained by that candidate validation run only after
proving it binds the same source commit, tree, version, and recorded integrity. When
the release-note resource derived from the snapshotted body equals the packaged one,
it SHALL publish the validated bytes unchanged. Otherwise it SHALL replace only the
packaged release-note resource with the one derived from the snapshotted body and
SHALL prove every other entry, entry mode, and the installer package byte-identical
to the validated pair. Stable publication SHALL NOT rebuild the
application, repack from source, or rerun the validation suite. It SHALL require the
Release to remain published with the snapshotted body immediately before npm, publish both packages to npm `latest` with provenance, verify and exercise the
published pair, upload the validated asset, fast-forward `master`, and prepare
reopening. Apps, bots, pushed tags, and dispatch payloads SHALL grant no npm
authority. Existing release tags SHALL never be moved or reused.

npm publication SHALL authenticate only through npm trusted publishing with the job's
GitHub OIDC identity; no long-lived npm token SHALL be used. Before either package
upload starts, publication SHALL require an npm CLI that supports trusted publishing
and SHALL complete the trusted-publishing token exchange for both packages. A refused
exchange SHALL fail before either upload and SHALL name the calling workflow and
environment that npm must trust.

#### Scenario: Work lands on develop
- **WHEN** a commit declaring a prerelease version is pushed to `develop`
- **THEN** no publication SHALL start solely from that push, and a later trusted request MAY select it only while it remains authoritative

#### Scenario: Prepare a stable draft
- **WHEN** the maintainer selects stable `0.1.8` from authoritative `develop` declaring `0.1.8-dev`
- **THEN** preparation SHALL create or reuse an unpublished source-bound draft, start candidate validation of that source as `0.1.8`, print the validation URL on its own line, and wait without package publication, tag, public Release, pull request, or `master` movement
- **AND** after validation succeeds it SHALL print the draft editing URL exactly once on its own line
- **AND** it SHALL NOT wait for a draft save or ask the maintainer to enter `0.1.8` again

#### Scenario: Candidate validation fails while the command waits
- **WHEN** the candidate validation run completes without success
- **THEN** the command SHALL fail with the failed jobs and their reasons, SHALL NOT print the draft editing URL, and SHALL leave the draft unpublished

#### Scenario: A dispatch wrapper calls the publisher
- **WHEN** `release-candidate.yml` or `develop.yml` is dispatched on `develop` and calls the reusable publisher
- **THEN** the publisher SHALL accept the caller's `workflow_dispatch` event together with that wrapper's default-branch workflow identity and SHALL reject any other workflow identity or ref

#### Scenario: Generate a Pi-style changelog draft
- **WHEN** preparation creates a new draft for stable `0.1.8`
- **THEN** its body SHALL begin with `## [0.1.8] - YYYY-MM-DD` and group applicable entries under level-three Breaking Changes, New Features, Added, Changed, and Fixed headings
- **AND** a retained version/date heading SHALL identify the expected version and a valid calendar date while the body remains human-editable

#### Scenario: A stale local tag survives a deleted Release
- **WHEN** the local clone still holds a `v0.2.2` tag that GitHub deleted with its Release, and v0.2.1 is the latest published stable Release
- **THEN** the v0.2.2 draft SHALL list every pull request merged after v0.2.1 on the source's first-parent history, not only those after the stale tag

#### Scenario: Preparation repeats while validation runs
- **WHEN** the command runs again for the same source and version while a candidate validation is running or has succeeded
- **THEN** it SHALL reuse that validation and the existing draft without overwriting the draft body, and SHALL resume waiting on that run

#### Scenario: A stable version is requested
- **WHEN** an authorized human chooses **Publish release** on the prepared draft after its candidate validation succeeded
- **THEN** GitHub SHALL create the tag at the bound source and trusted code SHALL publish both candidate-validated packages to npm `latest` without rebuilding or revalidating them, upload the asset, fast-forward `master`, and prepare the reopening pull request without another version entry

#### Scenario: A draft is published through GitHub prematurely
- **WHEN** the draft is published while its candidate validation is running, failed, or absent
- **THEN** publication SHALL fail before npm and the Release SHALL return to draft

#### Scenario: A draft exists without approval
- **WHEN** a draft is created, edited, saved, viewed, or passes candidate validation or unrelated CI but is not published
- **THEN** stable npm publication SHALL remain forbidden

#### Scenario: A stable request lacks reviewed notes
- **WHEN** the published Release is a prerelease, retargeted, ambiguous, unsafe, or not at its tag's commit, its tag is annotated or elsewhere, its source is outside `develop` history, or its publisher is an App, bot, or unauthorized user
- **THEN** the workflow SHALL fail before package construction

#### Scenario: Approved publication fails before final publication
- **WHEN** candidate-run gating, candidate package adoption, the trusted-publishing preflight, or cancellation stops publication before either npm upload starts
- **THEN** the Release SHALL return to draft and its unconsumed tag SHALL be deleted
- **AND** uncertain npm state SHALL keep the Release and tag and require rerunning the same run rather than creating or moving a tag manually

#### Scenario: A release-review PR is manually merged
- **WHEN** a release-note pull request from a retired protocol is manually or automatically merged
- **THEN** that merge SHALL grant no stable publication authority

#### Scenario: The published body changes before npm
- **WHEN** the published Release is edited or returned to draft after its body was snapshotted and before npm upload
- **THEN** publication SHALL fail before npm and the Release SHALL be returned to draft

#### Scenario: A stable request names an unacceptable version
- **WHEN** the draft or tag omits a valid version, names a prerelease, or names a version below the open development core
- **THEN** preparation or the workflow SHALL fail before package construction

#### Scenario: A source declares a stable version
- **WHEN** selected `develop` declares `0.1.8` instead of one open `0.1.8-dev` identity across package files
- **THEN** every publication channel SHALL refuse the source before release mutation

#### Scenario: Develop advances after draft preparation
- **WHEN** authoritative `develop` gains commits after the draft was bound to its source
- **THEN** publication SHALL publish the bound source rather than silently retargeting to the newer tip
- **AND** reopening SHALL use the then-current compatible `develop`

#### Scenario: A tag disagrees with its commit
- **WHEN** the target tag points at a commit other than the Release's bound source, or is annotated
- **THEN** preparation, publication, and rollback SHALL refuse it without deleting, moving, or reinterpreting it

#### Scenario: Stable staging succeeds
- **WHEN** candidate validation of the bound source and version succeeds
- **THEN** no npm publication SHALL start until an authorized human publishes the draft
- **AND** that success SHALL be the only candidate evidence publication accepts for that source and version

#### Scenario: Native final publication succeeds
- **WHEN** publication of the exact published draft completes
- **THEN** the tag SHALL point at the bound source, npm SHALL serve both exact packages under `latest`, the Release SHALL carry the validated asset, `master` SHALL equal the source, and one reopening PR SHALL be prepared

#### Scenario: A release tag is pushed
- **WHEN** a `v*` tag is pushed without publishing the prepared draft
- **THEN** no npm publication SHALL start from the push and stable preparation SHALL refuse the existing tag without moving or reusing it

#### Scenario: A version is already published
- **WHEN** either target package version already exists
- **THEN** preparation and a new publication SHALL fail without republishing it
- **AND** a rerun of the failed jobs of the same publication run MAY verify and skip identical immutable bytes

#### Scenario: The note is unchanged after candidate validation
- **WHEN** the published body derives the same release-note resource as the validated package
- **THEN** publication SHALL publish the candidate-validated tarballs with their validated integrity unchanged

#### Scenario: The note is edited after candidate validation
- **WHEN** the maintainer edits the draft body after candidate validation succeeds and then publishes it
- **THEN** publication SHALL replace only the packaged release-note resource with the published body, SHALL prove every other entry and the installer unchanged, and SHALL publish the result without rebuilding or rerunning the validation suite
- **AND** npm, the GitHub Release, and the in-product release note SHALL carry the published body

#### Scenario: The candidate package cannot be adopted
- **WHEN** the candidate run's package artifact is missing or expired, or binds another source, tree, version, or integrity, or the note swap would change any other entry
- **THEN** publication SHALL fail before npm, return the Release to draft, and direct the maintainer to rerun candidate validation

#### Scenario: npm does not trust the calling workflow
- **WHEN** npm refuses the trusted-publishing token exchange for either package
- **THEN** publication SHALL fail before either upload starts, name the calling workflow and environment to register as trusted publisher, and return the Release to draft

### Requirement: Resource-sensitive fast validation is partitioned deterministically
The fast validation tier SHALL declare tests whose subprocess, temporary-repository, or release-store workloads require protection from shared runner contention. Every declared resource-sensitive test SHALL be excluded from the parallel remainder, SHALL execute exactly once in one non-file-parallel partition process on an isolated runner under the partition's explicit hang bound, and SHALL retain all of its semantic assertions. The hang bound SHALL be the same explicit thirty-second bound the other explicit fast-tier invocations declare; it SHALL be recorded in the plan evidence as explicit, and it SHALL NOT serve as a performance assertion. Pull-request validation and exact-package validation SHALL derive the same partition from the same authoritative suite configuration on every platform. The ordinary remainder and resource-sensitive partition SHALL report separate planned commands, elapsed time, outcomes, and available subprocess or fixture timing. A failed assertion, process error, missing or duplicate test owner, or hang-bound expiry SHALL fail the tier without automatically retrying the test. Per-test durations SHALL remain available as evidence, and the focused timing report SHALL name every test body above five seconds so a slowdown is visible without failing the pull request on shared-runner variance.

#### Scenario: Fast tier is planned
- **WHEN** validation expands the fast tier
- **THEN** every resource-sensitive test SHALL be absent from the parallel remainder and present exactly once in the single non-file-parallel partition invocation under the explicit hang bound
- **AND** every other retained fast test SHALL remain owned by the ordinary remainder or another explicit scope

#### Scenario: Pull request and package use the fast tier
- **WHEN** pull-request validation and exact-package validation select the fast tier
- **THEN** both SHALL use the same authoritative resource-sensitive partition and the same explicit hang bound

#### Scenario: Resource-sensitive assertion fails
- **WHEN** a resource-sensitive test reports an assertion failure, process error, or exceeds the explicit hang bound
- **THEN** validation SHALL fail without automatically rerunning that test or converting the result to success

#### Scenario: Isolated test remains slow
- **WHEN** repeated focused evidence lists a resource-sensitive test body above five seconds
- **THEN** its fixture or subprocess workload SHALL be diagnosed and optimized
- **AND** the hang bound SHALL NOT be raised to hide it

#### Scenario: Validation evidence is inspected
- **WHEN** a maintainer reads the validation plan or outcomes
- **THEN** the ordinary remainder and resource-sensitive partition SHALL have distinct identifiers, commands, durations, and results
- **AND** available subprocess or fixture timing SHALL identify whether resource setup, child execution, or assertions consumed the elapsed time

## REMOVED Requirements

### Requirement: The native terminal host is validated in CI rather than on workstations
**Reason**: The native terminal host is removed; A1 ships no native code.

**Migration**: None. The Ghostty VT test, fuzz, fidelity, parity, and resident-progress steps are deleted from the workflows.

### Requirement: Published-pair lanes expose their native identity
**Reason**: There is no native artifact whose identity a lane could expose.

**Migration**: None.

### Requirement: Complete native validation distinguishes semantic failure from bounded fixture release
**Reason**: There is no native validation.

**Migration**: None.

### Requirement: Validation candidates carry the lane's release terminal host
**Reason**: Candidates carry no terminal host.

**Migration**: Exact-package lanes validate the pure JavaScript package.

### Requirement: Pull-request chaos runs use a shorter bounded budget
**Reason**: The resident chaos harness is removed with resident tabs.

**Migration**: None.

### Requirement: Native toolchains and caches are pinned and stable
**Reason**: There is no Rust or Zig toolchain to pin.

**Migration**: `rust-toolchain.toml`, `prepare-ci-rust.sh`, and the native cache steps are deleted.

### Requirement: Exact packages carry loadable native addons
**Reason**: Exact packages carry no addons.

**Migration**: Pack metadata tests assert the absence of `dist/native`.

### Requirement: Native assembly uses explicit complete and core build contracts
**Reason**: The build has one contract: TypeScript compilation plus resource generation.

**Migration**: `npm run build` and `npm run build:core` become equivalent; `build:terminal-host` and `build:process-guardian` are removed.

### Requirement: macOS release validation proves packaged supervision and containment
**Reason**: There is no supervisor or containment to prove.

**Migration**: The macOS exact-package lane validates launch, resume, and cleanup of the direct single-process UI.

### Requirement: macOS x64 release artifacts are cross-compiled
**Reason**: There are no native artifacts to compile for any target.

**Migration**: None.

### Requirement: Reused validation setup retains exact identity
**Reason**: Restated under a new name without its resident-tab, supervisor, launch-guardian, containment, native-host, or timestamp scenarios, which no longer describe the single-agent product.

**Migration**: See the ADDED requirement "Reused validation setup and build caches retain exact identity".

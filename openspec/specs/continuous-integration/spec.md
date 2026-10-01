# Continuous Integration Specification

## Purpose

Defines proportionate automated validation: fast checks during development, package gates for previews, and the complete suite only for stable releases.

## Requirements

### Requirement: Validation effort matches the change and the channel
Automated validation SHALL scale with what is being shipped. Documentation and specification changes SHALL require no product build or product test execution, but SHALL run every lightweight governance consistency check whose scanned inputs they change; OpenSpec changes SHALL also pass strict OpenSpec validation. Pull requests into `develop` SHALL require a bounded PR core consisting of typechecking, architecture and applicable governance checks, directly changed tests, reviewed path-owned test scopes, and a small current-product smoke set. They SHALL select additional rendering, startup, package, compatibility, and platform evidence only when coarse reviewed ownership marks it affected. Unknown operational inputs and changes to validation authority SHALL select complete development validation. Preview publication SHALL additionally require the complete fast tier and exact-package gates on every supported platform. A numbered development preview SHALL validate the exact package on the Windows, Linux, and macOS Node 24 lanes; Windows Node 22 coverage of every development head SHALL be provided by nightly publication and complete regression rather than by each preview. The lane set SHALL be derived from the publication mode by one reviewed repository script rather than a literal workflow matrix. Stable publication SHALL require the complete automated suite on every supported platform. The scheduled nightly workflow SHALL run one full tracked-repository documentation review and complete retained automated coverage against its authoritative `origin/develop` source before publication can succeed.

#### Scenario: Docs-only pull request
- **WHEN** every changed path is documentation, an OpenSpec artifact, a Markdown file, `LICENSE`, or `.gitignore`
- **THEN** the required development check SHALL avoid product builds and tests, run strict OpenSpec validation when applicable, and run docs-sensitive governance consistency checks

#### Scenario: Code pull request targets develop
- **WHEN** a pull request changes classified non-documentation paths without changing validation authority or an unknown operational input
- **THEN** validation SHALL run the bounded PR core and every additional scope selected by reviewed ownership
- **AND** it SHALL NOT require unrelated retained tests merely because they belong to the complete fast tier
- **AND** the required aggregate check SHALL gate the merge

#### Scenario: Validation authority or unknown input changes
- **WHEN** a pull request changes workflow selection, ownership, suite composition, aggregation authority, common build policy, or an operational path with no trustworthy owner
- **THEN** validation SHALL run complete applicable development coverage or block
- **AND** no selective result SHALL be inferred from the untrusted policy

#### Scenario: Preview candidate is built
- **WHEN** a preview is published to `next`
- **THEN** validation SHALL run the complete fast tier and exact packed-candidate gates on Windows, Linux, and macOS without requiring every stable-only scope

#### Scenario: Stable candidate is certified
- **WHEN** a version is published to `latest`
- **THEN** the complete automated suite SHALL pass against the exact final-version package bytes on Windows, Linux, and macOS before publication

#### Scenario: Scheduled nightly source is selected
- **WHEN** the nightly publication workflow resolves the authoritative `origin/develop` commit
- **THEN** one platform-independent job SHALL inspect documentation governance across every tracked policy-relevant file at that exact commit
- **AND** the retained platform validation matrix SHALL execute complete coverage without repeating the same documentation review

#### Scenario: Development preview lanes are selected
- **WHEN** a manual development publication resolves its validation matrix
- **THEN** it SHALL validate the exact package on Windows Node 24, Linux Node 24, and macOS Node 24
- **AND** nightly and stable publication SHALL keep validating on Windows Node 22 as well
- **AND** the selected lanes SHALL come from the reviewed matrix script for that mode

### Requirement: Development validation impact is classified deterministically
The development workflow SHALL derive one machine-readable validation selection from the complete merge-base-to-head change, including additions, modifications, copies, deletions, rename sources, and rename destinations. Selection SHALL use a bounded, reviewed ownership registry that maps stable path groups, changed tests, shared support, explicit invalidators, and integration execution cadence to logical scopes and platform/runtime targets. The ownership result SHALL be understandable from path and policy records without requiring successful whole-repository source parsing. Dependency reachability MAY add scope reasons but SHALL NOT be the sole authority for a known coarse owner.

Every changed pull-request-eligible retained test SHALL select its owning scope, including tests outside the PR core. A changed exhaustive-only test SHALL be recorded as deferred from ordinary PR execution and SHALL select its focused deterministic contract coverage rather than its exhaustive owner. Changes to shared test support SHALL select the pull-request owners of every retained test that reaches the changed path through the test tree's static import graph, and SHALL record affected exhaustive owners for Full/nightly execution; when no retained test reaches the path (including support consumed only from outside the test tree) or the graph cannot be built, the change SHALL select every owner the shared rule declares and SHALL record that fallback. Reachability SHALL only narrow a shared rule's declared owner set and SHALL never remove an owner selected by its own path or changed-test rules. Unknown ownership, unavailable history, malformed policy, or classifier failure SHALL select complete applicable pull-request coverage or block rather than produce an empty selection. Typechecking, architecture, applicable naming/documentation governance, validation-policy integrity, directly changed pull-request tests, and the declared smoke contracts SHALL remain mandatory in the PR core. Manual Development validation without a complete trusted change comparison SHALL run all retained pull-request scopes; Full regression and nightly/release coverage SHALL remain complete and SHALL not be reduced by PR impact selection. An implementation-bound lifecycle association SHALL disable the documentation-only and version-only exemptions so the PR core always runs, and SHALL NOT by itself select conservative ownership; the associated pull request's unit and integration owners SHALL still be chosen by impact from its complete change.

#### Scenario: Changed source is transitively rendered
- **WHEN** a changed operational path belongs to the reviewed UI/rendering owner or a declared shared input affects rendering
- **THEN** the classifier SHALL select the applicable rendering scope and target
- **AND** it SHALL record the owner and changed paths as bounded reasons

#### Scenario: Unrelated foundation changes
- **WHEN** the complete change contains no path, test, shared support, or invalidator owned by rendering or another integration scope
- **THEN** each unrelated integration scope SHALL be explicitly unselected
- **AND** the mandatory PR core SHALL still run

#### Scenario: Reachable dependency is deleted or renamed
- **WHEN** a base or head path participating in reviewed ownership is deleted, copied, or renamed
- **THEN** classification SHALL account for both source and destination identities
- **AND** moving a path SHALL not evade its applicable owners

#### Scenario: A transitive launch dependency changes
- **WHEN** a changed path belongs to the broad reviewed launch/startup group or declared shared support used by packaged launch
- **THEN** startup and every other declared affected pull-request integration owner SHALL be selected with bounded ownership reasons

#### Scenario: Only unrelated governance tooling changes
- **WHEN** every changed operational path belongs to reviewed governance tooling outside product integration and no validation invalidator changes
- **THEN** unrelated startup, package, rendering, compatibility, and platform scopes SHALL be explicitly unselected
- **AND** applicable PR-core governance checks SHALL remain required

#### Scenario: Integration tests or shared fixtures change
- **WHEN** a retained pull-request integration test or its declared shared support changes without production changes
- **THEN** the pull-request owners of that test, and of every retained test that imports the changed support directly or through other support files, SHALL execute in current-head PR validation with the reaching tests recorded as the reason
- **AND** affected exhaustive-only owners SHALL be recorded as deferred rather than silently omitted
- **AND** unknown test ownership SHALL select complete applicable pull-request coverage or block

#### Scenario: Shared support has no known importer
- **WHEN** a changed path under a shared-support rule is reached by no retained test, including one consumed only from outside the test tree, or the import graph cannot be built
- **THEN** classification SHALL select every owner the shared rule declares
- **AND** the selection SHALL record the declared fallback as the reason

#### Scenario: Exhaustive predecessor test changes
- **WHEN** the real multi-release predecessor test or its exhaustive-only support changes
- **THEN** ordinary PR validation SHALL run the focused deterministic predecessor contracts and record the exhaustive owner as deferred
- **AND** Full regression and nightly/release SHALL continue to execute the changed exhaustive test

#### Scenario: Validation selection infrastructure changes
- **WHEN** workflow selection, ownership, suite composition, aggregation, package dependencies, or common build configuration changes
- **THEN** classification SHALL select every retained pull-request scope whose execution or interpretation may be affected
- **AND** a selector or ownership-policy change SHALL require complete retained pull-request coverage
- **AND** exhaustive-only owners SHALL remain required by their Full/nightly cadence rather than becoming ordinary PR work

#### Scenario: Classification cannot prove safety
- **WHEN** the authoritative head, complete diff, registry, or required changed path cannot be established or interpreted
- **THEN** development validation SHALL run complete applicable pull-request coverage or block
- **AND** the reason and every cadence-deferred owner SHALL be visible in machine-readable and human-readable evidence

#### Scenario: Manual development validation has no trusted comparison
- **WHEN** Development validation is manually dispatched without a complete authoritative change comparison
- **THEN** every retained pull-request scope SHALL run rather than treating an empty diff as proof of no impact
- **AND** the maintainer SHALL use Full regression when exhaustive validation is required

#### Scenario: Implementation-bound diff is documentation-shaped
- **WHEN** an implementation-bound pull request's complete diff touches only documentation, OpenSpec, or archive paths
- **THEN** the PR core SHALL run without the documentation-only exemption
- **AND** ownership selection SHALL remain `impact` with no integration owner selected merely because of the association

#### Scenario: Implementation-bound diff touches owned source
- **WHEN** an implementation-bound pull request changes a path with a reviewed coarse owner
- **THEN** selection SHALL choose that owner's tests and the integration owners its ownership links
- **AND** unrelated pull-request owners SHALL remain explicitly unselected

### Requirement: Rendering evidence is modular without losing contract coverage
Rendering selection SHALL have exactly three outcomes: `none`, `smoke`, and `full`. `smoke` SHALL exercise representative independent producer, terminal-paint, semantic parity, and logical-damage evidence for a rendered shell or component change. `full` SHALL exercise every declared deterministic rendering workload when viewport composition, stream scheduling, terminal adaptation, rendering evidence infrastructure, package/terminal identity, or impact classification changes. Each selected workload SHALL be produced at most once within one gate, and its captured result SHALL supply all applicable semantic, paint, parity, determinism, and budget assertions. Rendering validation SHALL run independently and in parallel with ordinary fast validation, while the single required aggregate check SHALL require its success whenever its tier is not `none`.

#### Scenario: Rendered shell presentation changes
- **WHEN** impact classification finds a rendered shell, status, transcript component, or theme change outside the full-critical surface
- **THEN** the rendering tier SHALL be `smoke`
- **AND** representative captured terminal-paint evidence SHALL gate the pull request

#### Scenario: Rendering infrastructure changes
- **WHEN** the viewport, damage-aware terminal, presentation scheduler, rendering workload, capture/replay harness, package identity, or classifier changes
- **THEN** the rendering tier SHALL be `full`
- **AND** every deterministic rendering workload SHALL remain required

#### Scenario: Rendering is not involved
- **WHEN** the rendering tier is `none`
- **THEN** the rendering job SHALL be skipped without weakening the ordinary fast required path
- **AND** the aggregate gate SHALL accept that skip only when it belongs to the current classifier result

#### Scenario: Equivalent matrix assertions are requested
- **WHEN** multiple rendering contracts consume the same producer/mode/workload result in one gate
- **THEN** they SHALL evaluate one captured result rather than launching an equivalent matrix again

### Requirement: Validation selection and timing are auditable

Every modular development gate and complete-regression shard SHALL emit its selected scopes or assigned canonical work, classification or shard identity, exact source context, bounded reasons or plan digest, elapsed time, and result in machine-readable evidence and a concise workflow summary. The required aggregate SHALL bind those outcomes to the current pull-request head or standalone source and SHALL reject a missing, stale, unsuccessful, duplicated, or unexpectedly skipped required scope or shard.

#### Scenario: Maintainer inspects a rendering selection

- **WHEN** a pull request selects `smoke` or `full` rendering evidence
- **THEN** the workflow summary SHALL identify the changed input and classification reason that selected it

#### Scenario: Required modular result is stale

- **WHEN** a modular job result belongs to an older pull-request head or a different classifier result
- **THEN** the aggregate required check SHALL fail

#### Scenario: Maintainer inspects Windows Full regression

- **WHEN** Windows complete coverage executes in parallel shards
- **THEN** the workflow and merged evidence SHALL report each shard's assigned owners, elapsed time, result, and overlap context
- **AND** a failed owner SHALL remain attributable to its canonical Windows runtime and shard job

### Requirement: Development merges are gated by one required check
GitHub SHALL require the development validation check for pull requests into
`develop`, which SHALL be the only branch a change can be written to directly.

`master` SHALL record the commit the npm `latest` tag serves. Only a completed
stable publication SHALL write it, by fast-forward, and it SHALL carry no check or
pull-request requirement of its own — requiring one would prevent the release from
recording itself. Release tags SHALL be protected from deletion and movement and
SHALL likewise carry no check, because a tag is cut from a commit that has already
been validated. Publication SHALL NOT serve as the first automated validation of a
change.

#### Scenario: Required check has not passed
- **WHEN** a pull request targets `develop` and its required check is absent or unsuccessful
- **THEN** GitHub SHALL prevent the merge

#### Scenario: A stable version is published
- **WHEN** publication to npm `latest` completes
- **THEN** `master` SHALL be fast-forwarded to the published commit
- **AND** a preview publication SHALL leave `master` unchanged

#### Scenario: A release tag is targeted
- **WHEN** a deletion or force update of a `v*` tag is attempted
- **THEN** GitHub SHALL refuse it

### Requirement: Preview and stable artifacts are published from verified bytes
Every npm artifact required by a release, including `@timurproko/a1` and `@timurproko/a1-install`, SHALL be packed once for its final version, validated in that exact form, and uploaded without rebuilding. The publisher SHALL independently verify each package digest before upload and SHALL verify that registry bytes are the bytes validated for that package identity.

The installer artifact SHALL be built from the same authoritative source and selected version as the corresponding application publication but SHALL retain its distinct package identity and minimal package surface. Development publication SHALL place matching installer builds under `next`; stable publication SHALL place the stable installer under `latest`. The stable Release asset and `master` movement SHALL wait until every required artifact has been registry-verified and the published pair has been exercised.

#### Scenario: Published input differs
- **WHEN** either tarball offered for publication differs by digest from its validated artifact
- **THEN** publication SHALL fail before contacting npm for that artifact
- **AND** SHALL NOT record release completion

#### Scenario: The publisher is inspected
- **WHEN** the publishing job is read
- **THEN** it SHALL contain no dependency installation, build, or packing step for either artifact

#### Scenario: A stable pair is published
- **WHEN** stable application and installer artifacts have passed exact-byte validation
- **THEN** each SHALL be provenance-published and registry-verified under its own package identity
- **AND** the Release asset and `master` SHALL be written only after both required registry results succeed

#### Scenario: Installer publication fails after an application artifact exists
- **WHEN** one immutable package upload succeeds but the required pair is not completely verified
- **THEN** the workflow SHALL fail without uploading the Release asset or moving `master`, and SHALL keep the published Release and tag
- **AND** a rerun of the failed jobs SHALL verify existing immutable bytes rather than republish or rebuild them

### Requirement: The complete suite remains available on demand

The complete non-physical automated suite SHALL remain runnable locally (`npm run test:full`) and through manual workflow dispatch, so a maintainer can widen validation when a change feels risky, and SHALL run on a nightly schedule against the current `develop` tip so exhaustive owners and enforced budgets are exercised every day independent of publication. Routine development SHALL NOT require it.

Standalone and selected PR-attached Full regression SHALL execute the complete Windows Node 22 and Node 24 coverage through reviewed parallel hosted-runner shards. Each Windows runtime SHALL have `core`, `resource`, `rendering`, and `package` shard evidence derived from one canonical complete plan. Every canonical command and test invocation SHALL belong to exactly one shard, and one successful Windows lane result SHALL be reconstructed only from all four exact-source, exact-run, exact-attempt, exact-runtime shard results. Missing, duplicate, stale, malformed, failed, cancelled, or unexpected shard evidence SHALL fail the applicable lane and required aggregate. Linux, macOS, local full validation, and publication validation MAY retain one sequential complete plan.

A scope that the complete-regression lanes cannot run MAY be excluded from the `full-release` plan only through an explicit `fullReleaseExclusion` reason on its definition in `config/validation-suites.json`. The only permitted exclusion is the Windows-only `terminal-host` scope, whose pull-request owner validates every change to its paths. Adding another exclusion SHALL require a reviewed change to this requirement.

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
- **THEN** it SHALL carry a non-empty reason, SHALL NOT be included by `full-release`, and SHALL be `terminal-host`

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
to the validated pair. Stable publication SHALL NOT rebuild the process guardians or
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

### Requirement: Preview versions cost no commits
A preview version SHALL be derived at publish time from the open base version and the
unique merged pull-request number associated with the exact selected `develop` commit.
A stable version SHALL be derived from the tag of the published source-bound Release
and stamped only while packing. Neither version SHALL be committed before
publication. Between releases the repository SHALL declare one open prerelease
version.

After verified stable publication, trusted automation SHALL create one reopening
pull request whose single commit persists the exact published note and consistently
declares the next prerelease in the application manifest, root lockfile, and installer
manifest. It SHALL use then-current compatible `develop`, change no other paths, keep
auto-merge disabled, and never merge the pull request.

#### Scenario: Several commits land in a row
- **WHEN** several commits are pushed to `develop`
- **THEN** no publication SHALL start from those pushes alone, and a later development request SHALL derive one preview from the then-authoritative source without a version commit

#### Scenario: A release is prepared for review
- **WHEN** `develop` declares `0.1.8-dev` and stable `0.1.8` is selected
- **THEN** preparation SHALL create the draft without committing either `0.1.8` or its note to `develop`

#### Scenario: A release is prepared but not yet tagged
- **WHEN** `develop` declares a stable version, a state release automation does not produce
- **THEN** development and stable publication SHALL refuse it until a reviewed PR restores one open prerelease identity

#### Scenario: A release reopens development
- **WHEN** stable `0.1.8` is published to npm from approved source declaring `0.1.8-dev`
- **THEN** trusted automation SHALL prepare one PR declaring `0.1.9-dev` and adding the exact published `docs/releases/0.1.8.md`
- **AND** development SHALL be reported reopened only after an authorized human manually merges that PR following required CI

#### Scenario: Develop advances during publication
- **WHEN** unrelated work advances `develop` before reopening is prepared
- **THEN** reopening SHALL use the then-current tip only when its package identity and open version remain compatible and the released note is absent
- **AND** it SHALL never rewrite or discard unrelated work

#### Scenario: Reopening work already exists
- **WHEN** the expected reopening branch or PR already exists
- **THEN** automation SHALL reuse it only if repository, state, base, head, single-parent commit, exact changed paths, versions, approved-note digest, and absence of auto-merge all match
- **AND** conflicting work SHALL be preserved and refused rather than overwritten

### Requirement: A failing pull request is the next piece of work
The result of a pull request's validation SHALL be read before any further work
begins, and a pull request whose validation is failing SHALL be repaired before new
work starts. Work SHALL NOT be stacked on a change whose validation is failing,
because the repair then costs a merge with the base branch and a second full run.
A failure that this change did not cause SHALL be reported with its evidence and
still addressed, since it fails every pull request behind it. Validation SHALL be
reported as what it said rather than as what it was expected to say.

#### Scenario: Validation fails
- **WHEN** a pull request's required check reports a failure
- **THEN** repairing it SHALL be the next task
- **AND** no further change SHALL be started on top of it until it passes

#### Scenario: The failure came from elsewhere
- **WHEN** a failure is not caused by the change under review
- **THEN** it SHALL be reported with the evidence for that
- **AND** it SHALL still be addressed before other work continues

#### Scenario: The result has not been read
- **WHEN** validation has been triggered and its result has not been read
- **THEN** the change SHALL NOT be described as passing

### Requirement: Documentation-only changes merge on their own
Repository automation SHALL arrange automatic squash integration only for non-draft,
non-implementation-bound PRs when every changed and renamed-from path is under
`openspec/**`, under `docs/**` other than `docs/releases/**`, or is exactly the root
`README.md`. A release-history path SHALL always require manual integration. An
implementation association or introduction of a new active change SHALL hold the PR
for manual integration even with an OpenSpec-only diff; malformed or unavailable
lifecycle data SHALL fail closed. Removing a marker SHALL NOT bypass the authoritative
base/head check. Other ordinary docs, standalone existing-change revisions, and
verified archive follow-ups SHALL retain eligibility. It MAY arm an eligible pull
request while required validation is pending because protected `develop` remains the
merge gate. After successful validation for the current head, automation SHALL
reconcile that head when GitHub reports `clean` or positively mergeable `unstable`
state through a normal protected squash-merge request enforcing that expected head
SHA. A specifically recognized unstable-status rejection when arming SHALL be handled
by bounded re-evaluation or an explicit deferred outcome, not by creating another
failed check solely for that state transition.

An eligible pull request SHALL pass documentation-sensitive governance and, when
OpenSpec is touched, strict OpenSpec validation. A pull request containing any other
path SHALL remain open for local maintainer validation and manual merge, including
behavior-preserving refactors and mixed documentation-plus-code changes. CI success
SHALL NOT substitute for local maintainer acceptance of code. Failed validation or
successful validation for an older head SHALL NOT authorize direct integration.
State recovery SHALL NOT change required checks, grant bypass authority, or turn
unrelated API failures into success.

#### Scenario: Complete diff is auto-merge eligible
- **WHEN** a non-draft, non-implementation-bound PR has every changed and renamed-from path under `openspec/**`, under eligible `docs/**`, or exactly at the root `README.md`
- **THEN** automation SHALL arrange squash integration behind the required validation gate

#### Scenario: Release-history document changes
- **WHEN** any changed or renamed-from path is `docs/releases/<version>.md`
- **THEN** documentation automation SHALL disable any armed auto-merge and leave the pull request for manual integration

#### Scenario: Maintained docs change is validated
- **WHEN** an otherwise eligible pull request changes a path under `docs/**`
- **THEN** CI SHALL run documentation-sensitive governance before the required validation gate succeeds

#### Scenario: OpenSpec change is validated
- **WHEN** an eligible pull request changes a path under `openspec/**`
- **THEN** CI SHALL run strict OpenSpec validation before the required validation gate succeeds

#### Scenario: Eligible pull request is still validating
- **WHEN** an eligible current head is blocked only because required validation is pending
- **THEN** automation MAY arm squash auto-merge and SHALL rely on protected `develop` to prevent premature integration

#### Scenario: Eligible pull request is already clean
- **WHEN** successful required validation belongs to the current head and GitHub already reports that head clean
- **THEN** automation SHALL reconcile squash integration using that exact head SHA

#### Scenario: Successful validation belongs to an older head
- **WHEN** the pull request head differs from the head that passed required validation
- **THEN** automation SHALL NOT directly merge the current head

#### Scenario: Behavior-preserving code changed
- **WHEN** a pull request contains any changed or renamed-from path outside the auto-merge allowlist
- **THEN** it SHALL NOT be armed to merge automatically even if behavior is intended to remain unchanged
- **AND** it SHALL wait for local maintainer acceptance and manual merge

#### Scenario: Documentation and code are mixed
- **WHEN** a pull request contains both an allowed documentation path and a path outside the allowlist
- **THEN** the entire pull request SHALL follow the manual code path

#### Scenario: Validation passes while the policy check is unstable
- **WHEN** an eligible current head passes required validation while a pending or failed non-required check leaves GitHub reporting a positively mergeable unstable head
- **THEN** automation SHALL attempt normal protected squash integration with the validated head SHA
- **AND** a failed attempt to arm auto-merge SHALL NOT be a prerequisite to that attempt

#### Scenario: Arming reports an unstable-state transition
- **WHEN** GitHub specifically rejects arming because the pull request is in unstable status
- **THEN** automation SHALL refresh state and re-evaluate its eligibility and current-head validation within a bounded recovery attempt
- **AND** if safe integration cannot yet be established it SHALL report deferral without claiming the pull request merged or that required validation passed

#### Scenario: Real validation or API failure remains visible
- **WHEN** required validation fails or automation encounters an authentication, permission, transport, malformed-response, or unrelated API error
- **THEN** that failure SHALL remain visible and SHALL NOT be reclassified as a successful unstable-state recovery

### Requirement: Resource-sensitive fast validation is partitioned deterministically
The fast validation tier SHALL declare tests whose subprocess, temporary-repository, storage, or release-cohort workloads require protection from shared runner contention. Every declared resource-sensitive test SHALL be excluded from the parallel remainder, SHALL execute exactly once in one non-file-parallel partition process on an isolated runner under the partition's explicit hang bound, and SHALL retain all of its semantic assertions. The hang bound SHALL be the same explicit thirty-second bound the other explicit fast-tier invocations declare; it SHALL be recorded in the plan evidence as explicit, and it SHALL NOT serve as a performance assertion. Pull-request validation and exact-package validation SHALL derive the same partition from the same authoritative suite configuration on every platform. The ordinary remainder and resource-sensitive partition SHALL report separate planned commands, elapsed time, outcomes, and available subprocess or fixture timing. A failed assertion, process error, missing or duplicate test owner, or hang-bound expiry SHALL fail the tier without automatically retrying the test. Per-test durations SHALL remain available as evidence, and the focused timing report SHALL name every test body above five seconds so a slowdown is visible without failing the pull request on shared-runner variance.

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

### Requirement: Pull requests enforce brand-neutral names and classified environment contracts
Development validation SHALL inspect the complete head contents of every added, modified, copied, and renamed-to first-party naming-policy input in the complete pull-request merge-base-to-head change. The policy SHALL cover owned production code, entry points, tooling, tests, and native source, plus environment definitions and uses in owned configuration and workflows. It SHALL enforce the product-identity naming and environment-classification requirements without changing supported external product identity. Only declared public/integration boundary uses and exact unresolved exposure-review entries SHALL receive external-name exceptions; a confirmed private key SHALL NOT gain an exemption for legacy compatibility. Runtime aliases, dual reads/writes, or fallback key definitions that restore obsolete private spellings SHALL fail governance.

Identifier findings SHALL be derived from language-aware source inspection, not a raw text search. Coverage SHALL include private identifiers, local aliases, binding patterns, type members, quoted or statically known computed member names, and equivalent supported native-language forms. Environment-key inspection SHALL include string-valued definitions and supported accesses, not only identifier tokens. Comments, ordinary user-facing strings, and source snippets that exist solely as test data SHALL NOT be misreported as declarations; actual environment-contract fixtures SHALL be classified explicitly. External dependencies, immutable vendored sources, build output, and other worktrees SHALL be excluded through explicit ownership rules rather than whole first-party subtrees being silently ignored.

#### Scenario: A new file introduces a branded constant
- **WHEN** a pull request adds a first-party source file with a forbidden internal constant name
- **THEN** the naming check SHALL fail and report the path, line, name, and violated rule

#### Scenario: An unchanged line in a modified file violates the policy
- **WHEN** a pull request changes a file containing a forbidden internal name outside the edited lines
- **THEN** governance SHALL inspect the entire selected file and report that violation

#### Scenario: A file is copied or renamed into policy scope
- **WHEN** a pull request copies or renames a file into a first-party policy location
- **THEN** governance SHALL inspect the complete destination content at the current head
- **AND** the source path SHALL participate in ownership and full-scan invalidation decisions

#### Scenario: A file is removed or renamed out of scope
- **WHEN** a selected source path no longer exists at the head
- **THEN** governance SHALL account for its deletion or rename without attempting to parse missing content or inventing a successful scan
- **AND** a rename to another supported owned-source location SHALL NOT evade inspection

#### Scenario: A private environment key is hidden in a string
- **WHEN** a selected input defines or uses a product-branded private environment key as an active string-valued setting or fallback
- **THEN** environment-contract governance SHALL reject it even when the surrounding variable names are neutral or it is labeled as a legacy compatibility exception

#### Scenario: A private legacy exception is proposed
- **WHEN** a pull request changes classification data to permit an obsolete private key for runtime use
- **THEN** the exception validation and full policy audit SHALL fail
- **AND** explicit negative-test data containing the obsolete spelling SHALL NOT make it a supported setting

#### Scenario: A fixture describes forbidden code
- **WHEN** a governance test contains a source snippet as test data rather than as an executable declaration in that file
- **THEN** the naming check SHALL not count the snippet as the test file's own declarations
- **AND** regression tests SHALL independently prove that inspecting the snippet as source detects its violations

#### Scenario: A public identity value is retained
- **WHEN** a selected input uses a declared public setting or serialization spelling at its approved boundary
- **THEN** governance SHALL accept that boundary use without permitting similarly spelled internal declarations elsewhere

### Requirement: Naming validation is fail-closed and bound to the current change
Naming validation SHALL use the authoritative PR head and its resolved merge base, with rename and deletion information intact. A missing base, unavailable diff, unreadable selected file, invalid policy input, unsupported owned-source syntax, or inspection failure SHALL prevent a successful changed-file naming result; it SHALL NOT silently fall back to an empty diff or skip an unclassified input. A successfully completed conservative full scan SHALL be allowed when changed-file classification is insufficient and the authoritative head is known.

Changes to the naming policy, environment classifications, exception definitions, source-ownership rules, parser dependencies, or naming-check selection and integration SHALL require a full tracked-source naming/environment audit and policy regression tests. Full validation SHALL retain the full audit. An ordinary PR with unchanged policy SHALL be eligible for the changed-file audit without a duplicate complete audit solely for this rule. Documentation-only changes outside naming-policy inputs SHALL retain the existing no-product-build/no-product-test path; documentation that is explicitly an input to exception validation SHALL receive the applicable lightweight consistency check.

The required development aggregate SHALL require the applicable naming result and bind it to the current head. Evidence SHALL identify the base and head, changed or full mode, selected and inspected inputs, explicit exclusions, escalation reasons, findings, elapsed time, and result. A missing, stale, failed, or unexpectedly skipped required naming result SHALL block integration.

#### Scenario: The PR base cannot be resolved
- **WHEN** naming selection cannot establish the authoritative merge base and no complete authoritative-head audit succeeds
- **THEN** naming validation SHALL fail rather than inspect no files and report success

#### Scenario: A parser cannot inspect a selected input
- **WHEN** a selected owned source cannot be read or analyzed under the supported syntax policy
- **THEN** validation SHALL fail with an actionable input-specific diagnostic

#### Scenario: A policy change affects unchanged source
- **WHEN** a pull request changes identifier matching, environment exceptions, ownership rules, or check selection
- **THEN** validation SHALL run the policy regression tests and the full tracked-source audit
- **AND** violations in otherwise unchanged files SHALL block integration

#### Scenario: A prior head passed naming validation
- **WHEN** the pull-request head changes after the naming result was produced
- **THEN** the required aggregate SHALL reject that stale result for the new head

#### Scenario: A required naming job is skipped
- **WHEN** the current selection requires naming validation but its result is absent or skipped
- **THEN** the required aggregate SHALL fail

#### Scenario: Only non-policy documentation changes
- **WHEN** every changed path is documentation or specification material outside naming-policy inputs
- **THEN** naming validation SHALL record an explicit not-applicable result or selection-authorized skip without product execution
- **AND** existing documentation-sensitive and strict OpenSpec gates SHALL remain required as applicable

### Requirement: macOS release validation proves packaged supervision and containment
Pull-request and exact-package validation for changes affecting supervision, containment, release startup, or native guardian artifacts SHALL exercise the supported macOS path rather than accepting build success alone. Exact-package preview publication SHALL remain ineligible unless the macOS package starts a correlated supervisor, launches the packaged public command through certified Darwin containment, completes representative resume and cleanup behavior, and reports actionable startup diagnostics on injected failure.

#### Scenario: macOS supervisor starts from exact packaged bytes
- **WHEN** the macOS exact-package lane materializes and launches a preview candidate
- **THEN** the selected supervisor SHALL publish verified endpoint metadata for the candidate and the packaged public launch chain SHALL reach input-ready state

#### Scenario: Darwin native containment regresses
- **WHEN** process identity, process-group creation, foreground transfer, parent-loss cleanup, artifact support, or guardian integrity fails on macOS
- **THEN** a required pull-request or exact-package macOS check SHALL fail before publication

#### Scenario: Detached supervisor fails before listening
- **WHEN** a macOS validation fixture injects a pre-listen supervisor failure
- **THEN** validation SHALL observe the bounded correlated diagnostic rather than waiting for an undifferentiated endpoint timeout

#### Scenario: Development publication is accepted
- **WHEN** `npm run develop` selects a new authoritative candidate after this correction merges
- **THEN** Windows Node 22/24, Linux Node 24, and macOS Node 24 exact-package lanes, the npm publisher, the aggregate result, and registry `next` verification SHALL all succeed for the same package bytes

### Requirement: Exact packages carry a spawn-capable native process guardian
The exact packed package SHALL record each bundled platform's native process guardian with an executable file mode, regardless of which operating system packed it, so that posix installation and immutable release materialization preserve a spawn-eligible helper. Packing SHALL derive each guardian entry's executability from the per-platform guardian build manifest packed beside the binary, not from the pack host's filesystem permissions. Exact package surface validation SHALL assert every packed native guardian entry is executable on every lane that runs it, including lanes whose host cannot represent posix permissions. Executable mode SHALL NOT override the manifest's independent supported/unsupported capability decision.

#### Scenario: Packed on a host without posix permissions
- **WHEN** the exact package is packed on a host whose filesystem cannot record posix executable permission
- **THEN** the packed native process guardian entries for every bundled platform SHALL still carry an executable mode

#### Scenario: Executability is bound to certified build bytes
- **WHEN** packing records a native process guardian entry as executable
- **THEN** the entry bytes SHALL match the digest declared by that platform's guardian build manifest packed beside the binary

#### Scenario: Surface validation proves executability on any host
- **WHEN** exact package surface validation runs on any platform lane, including Windows
- **THEN** it SHALL fail unless every packed native process guardian entry is recorded executable

#### Scenario: Posix materialization preserves guardian executability
- **WHEN** the exact package is installed and materialized on Linux or Darwin
- **THEN** every bundled native guardian file SHALL remain executable
- **AND** a guardian whose manifest declares supported capability SHALL be spawn-eligible for the packaged public launch chain

#### Scenario: Executable artifact remains unsupported
- **WHEN** a bundled guardian has executable mode but its certified manifest declares the current platform unsupported
- **THEN** launch SHALL continue to reject that containment provider until a separate platform-capability change certifies it

### Requirement: Patch releases preserve prerelease-aware version semantics
Invoking `npm run release -- patch` SHALL promote a valid current prerelease version to its stable core without incrementing that core, and SHALL increment the patch number when the current version is already stable. The command SHALL report the source version, selected stable target, and prospective next development version before mutations.

The release command SHALL continue to require a target. It SHALL reject a missing target, invalid version, unknown target, invalid exact target, or extra positional arguments with actionable errors and no version, branch, PR, or publication mutation. No separate no-argument release mode SHALL be introduced. The existing `minor`, `major`, and exact stable-version commands SHALL remain available, with minor/major core-version arithmetic unchanged by this patch fix. Existing stable registry versions and tags SHALL remain protected against reuse or movement.

#### Scenario: Release the current development version with patch
- **WHEN** the repository declares `0.1.8-dev` and the maintainer invokes `npm run release -- patch`
- **THEN** the selected stable target SHALL be `0.1.8`
- **AND** the prospective development reopening SHALL be `0.1.9-dev`
- **AND** the command SHALL NOT select `0.1.9` as the stable target

#### Scenario: Promote a numbered development version
- **WHEN** the current version is `0.1.8-dev.123` and the target is `patch`
- **THEN** the stable target SHALL be `0.1.8`, not a version incremented from the preview number

#### Scenario: Increment an already-stable patch
- **WHEN** the repository declares stable `0.1.8` and the maintainer invokes `npm run release -- patch`
- **THEN** the selected stable target SHALL be `0.1.9`
- **AND** its prospective development reopening SHALL be `0.1.10-dev`

#### Scenario: Promote another valid prerelease with patch
- **WHEN** the current version is `0.1.8-rc.1` and the target is `patch`
- **THEN** the stable target SHALL be `0.1.8`, following the same prerelease-aware patch rule

#### Scenario: Retain minor and major targets
- **WHEN** the current version is `0.1.8-dev` and the maintainer explicitly supplies `minor` or `major`
- **THEN** the stable target SHALL be `0.2.0` or `1.0.0` respectively

#### Scenario: Request an exact stable target
- **WHEN** the maintainer supplies the valid exact target `0.4.0`
- **THEN** the selected stable target SHALL be `0.4.0` and its prospective development reopening SHALL be `0.4.1-dev`
- **AND** the existing registry and tag guards SHALL still apply

#### Scenario: Omit the required target
- **WHEN** the maintainer invokes `npm run release` without a target
- **THEN** the command SHALL display usage requiring `patch`, `minor`, `major`, or an exact stable version
- **AND** it SHALL make no release mutations

### Requirement: Release reopening pull requests integrate after validation
The post-publication next-development pull request SHALL remain subject to required
validation and SHALL integrate automatically through the documentation auto-merge
manager's verified release-reopening route once its exact current head passes required
validation. The release command SHALL NOT create a pre-publication release-note or
stable-version pull request, enable auto-merge itself, directly merge the reopening PR,
relax branch protection, or treat CI success on any head other than the current one as
permission to advance. It SHALL display the draft Release and reopening PR URLs with
phase-specific steps and verify the reopening PR's actual merge before reporting
completion. A reopening PR that fails verification SHALL fall back to manual merge.

Reopening preparation SHALL preserve the caller's checkout, staged/unstaged work,
and unrelated worktrees. Version edits SHALL affect only this package's manifest and
root lockfile version fields, not dependency versions, and the only additional file
SHALL be the exact approved `docs/releases/<released-version>.md`. Pending or failed
work SHALL remain identifiable without destructive resets or silent replacement of a
conflicting draft, branch, or PR. Reusing an existing reopening PR SHALL accept only no
armed auto-merge or squash auto-merge armed by the trusted manager.

#### Scenario: Prepare the stable version PR
- **WHEN** the command prepares stable `0.1.8` from `0.1.8-dev`
- **THEN** it SHALL present the draft GitHub Release for editing and SHALL create no stable-version or release-note pull request

#### Scenario: Prepare the reopening PR
- **WHEN** stable `0.1.8` is published successfully
- **THEN** the command SHALL present one PR containing `0.1.9-dev` version changes and the exact approved `docs/releases/0.1.8.md`
- **AND** that PR SHALL integrate without maintainer merge action once its current head passes required validation

#### Scenario: A version PR is not merged
- **WHEN** the reopening PR is closed without merging, cannot be verified, or remains pending beyond the bounded wait
- **THEN** the command SHALL report its identity and incomplete state without merging it itself or claiming that development reopened

#### Scenario: Local work appears while a release waits
- **WHEN** the caller's checkout changes while release orchestration is awaiting publication or the reopening PR
- **THEN** those changes SHALL be preserved and any unsafe local synchronization SHALL be declined with authoritative remote state reported

### Requirement: Development reopens only after verified stable publication
Trusted automation SHALL prepare the next patch development version only after the
publication run has verified both exact npm packages, exercised the published pair,
uploaded the asset, and fast-forwarded `master` for the published source. It SHALL
use the version, source, and note digest that publication bound, and SHALL fail
rather than silently substitute a newer source SHA or regenerated note.

For released `x.y.z`, the reopening target SHALL be `x.y.(z+1)-dev`. Reopening SHALL
be reported complete only after its separate PR containing the next version and exact
approved note is manually merged and remote content is verified. Failed or uncertain
publication SHALL not trigger reopening. Successful publication followed by
incomplete reopening SHALL be reported as two distinct outcomes without republishing
or altering immutable release records.

#### Scenario: Finish the current release cycle
- **WHEN** publication of stable `0.1.8` and its published note completes
- **THEN** trusted automation SHALL prepare a separate PR for `0.1.9-dev` plus `docs/releases/0.1.8.md`
- **AND** development SHALL be reported reopened only after that PR is manually merged and verified

#### Scenario: Publication fails or remains uncertain
- **WHEN** stable publication fails, is cancelled, or cannot be confirmed
- **THEN** no next-development PR SHALL be created by that run and the run summary SHALL provide recovery guidance without claiming release success

#### Scenario: The publication source becomes stale
- **WHEN** the published tag does not point at the source bound to the prepared draft
- **THEN** publication SHALL stop with the mismatch and SHALL not publish a newly selected SHA without a fresh deliberate preparation

#### Scenario: Reopening is incomplete after publication
- **WHEN** `0.1.8` is confirmed published but the `0.1.9-dev` and note PR fails or is not merged
- **THEN** the outcome SHALL distinguish published `0.1.8` from pending development reopening and SHALL not republish, move its tag, or falsely report develop at `0.1.9-dev`

### Requirement: Maintainer release documentation matches the command
The root README release section SHALL present concise, accurate `npm run release --
patch`, `minor`, `major`, and exact-version preparation examples and SHALL NOT be
required to duplicate internal publication lifecycle or recovery prose. The release
runbook and applicable command help SHALL explain the target-required rule,
prerelease promotion, draft Release editing, candidate validation, native **Publish
release** as the only stable npm trigger, automatic return to draft before npm,
rerunning failed jobs after npm, publication-before-reopening order, next-development
version, and the manual reopening-PR gate. They SHALL NOT advertise a no-argument
release mode, the retired `--approve` form, a Save-draft handoff, waiting for npm
readiness, a pre-publication notes PR, or self-merging reopening.

A dependency-free semantic governance check SHALL validate the applicable contract
whenever the root README or release runbook changes, including documentation-only
pull requests eligible for automatic integration. It SHALL reject malformed or
resolver-inaccurate command examples, missing operator safety gates, and retired
handoff instructions. Unrelated documentation changes SHALL not gain product builds
or broad product tests solely for this contract.

#### Scenario: Follow the README example
- **WHEN** a maintainer reads the root release section
- **THEN** `patch`, `minor`, `major`, and exact-version examples SHALL resolve to the documented stable targets and explain that choosing **Publish release** on the prepared draft publishes npm

#### Scenario: Read recovery guidance
- **WHEN** a maintainer needs preparation, validation, publication, reopening, or recovery behavior
- **THEN** the runbook SHALL state that a failure before npm returns the Release to draft, that a failure after npm is recovered by rerunning the same run's failed jobs, and that reopening follows confirmed publication and requires manual merge

#### Scenario: Documentation-only release commands drift
- **WHEN** a documentation-only pull request changes root release examples or the release runbook
- **THEN** lightweight semantic governance SHALL validate the changed contract before automatic integration and inaccurate examples, missing safety gates, or retired handoff instructions SHALL fail without broad product tests

### Requirement: Independent development partitions do not serialize feedback
Development validation SHALL schedule the mandatory PR core and each selected integration partition independently after its actual prerequisites. Resource-sensitive files selected by ownership SHALL remain non-file-parallel on an isolated runner, with the same authoritative membership and the same explicit hang bound used by complete validation. No selected test SHALL be duplicated between partitions on the same platform/runtime merely because job boundaries changed. Cross-platform and cross-runtime executions SHALL remain distinct evidence where selected.

The single protected-branch aggregate SHALL require the PR core and every scope selected for the current head and selection identity. It SHALL reject missing, failed, cancelled, stale, malformed, or unexpectedly skipped selected results. A skipped integration scope SHALL be acceptable only when the current trustworthy selection explicitly excludes it. Independent jobs SHALL not share mutable application state or owned process trees. The modular job matrix SHALL be derived from the trusted selection by one reviewed repository script that declares every Development modular job; an entry the selection leaves inactive SHALL NOT be scheduled, each scheduled job SHALL still resolve its own owners from the uploaded selection, and the aggregate SHALL still require successful evidence for every selected owner.

#### Scenario: Fast work and resume checks are selected
- **WHEN** a code PR requires the PR core, a resource-sensitive owner, and package resume integration
- **THEN** the resource-sensitive and resume jobs SHALL not depend on completion of unrelated core tests solely for sequencing
- **AND** all selected results SHALL be required before the aggregate succeeds

#### Scenario: Serialization would be replaced by contention
- **WHEN** a resource-sensitive partition is selected alongside ordinary validation
- **THEN** it SHALL execute on an isolated runner rather than concurrently on the ordinary runner
- **AND** it SHALL retain one-file-at-a-time execution and all existing assertions under the partition's explicit hang bound

#### Scenario: A selected partition is skipped
- **WHEN** the current selection requires a core or integration partition but that partition is missing, cancelled, or skipped
- **THEN** the aggregate SHALL fail even if every completed partition passed

#### Scenario: Evidence belongs to another selection
- **WHEN** a result belongs to another head, workflow run, or selection identity
- **THEN** it SHALL NOT satisfy the current aggregate

#### Scenario: Finalized Implementation candidate completes validation
- **WHEN** a finalized implementation-bound pull request in the Implementation phase runs ordinary exact-head validation
- **THEN** selected product validation and finalized-delivery validation SHALL both execute for that candidate
- **AND** the stable protected aggregate SHALL succeed in the same workflow run only after every selected result and the finalized delivery record succeed
- **AND** no Acceptance phase edit or second workflow run SHALL be required before manual review and merge

#### Scenario: Manual review rejects the implementation
- **WHEN** manual review finds a defect after the protected aggregate succeeds
- **THEN** the pull request SHALL remain open in Implementation while fixes are pushed
- **AND** the changed exact head SHALL run normal validation again before merge

#### Scenario: Complete validation is requested
- **WHEN** conservative PR classification, Full regression, nightly, preview, or stable validation requests complete retained coverage
- **THEN** every retained fast and applicable integration owner SHALL execute under its declared isolation and platform/runtime contract

#### Scenario: Inactive matrix entries are not scheduled
- **WHEN** the trusted selection activates only some declared modular jobs
- **THEN** the workflow SHALL schedule only the active entries and record the unscheduled ones in the run summary
- **AND** the aggregate SHALL fail when an active entry produced no successful evidence

### Requirement: Reused validation setup retains exact identity
Validation SHALL avoid repeated successful builds and candidate packing within a job when the consuming scopes use unchanged source, platform, architecture, toolchain, dependencies, and build inputs. Reuse SHALL depend on verified prerequisite evidence and present artifacts rather than an unchecked environment flag. Missing or incompatible setup evidence SHALL cause fresh preparation or an explicit failure before tests, never successful validation with stale artifacts.

Persistent caches SHALL be limited to integrity-checked dependency downloads and compatible native compiler intermediates, with validation of resulting artifacts after restoration. Clean-install gates SHALL still install exact candidate bytes into fresh private prefixes. Mutable installed fixtures, active releases, certification state, launch compile caches, and prior performance results SHALL not be restored as substitutes for current-head execution. Publication SHALL retain its existing pack-once and exact-byte authority.

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

#### Scenario: A native guardian compiler cache is warm
- **WHEN** a publication guardian build can reuse cached compiler intermediates for the same toolchain and dependency lockfile
- **THEN** the locked release build SHALL still run and its emitted artifact identity SHALL still be recorded
- **AND** a changed guardian source or lockfile SHALL rebuild the affected units rather than reuse a stale binary

### Requirement: Feedback optimization is measured without weakening coverage
Development validation SHALL report selection time, available queue time, setup/build/pack time, repository gate time, per-scope outcomes, and aggregate elapsed time separately. Package fixtures SHALL report bounded phase timings for installation, materialization, certification/warmup, launch, shutdown, and cleanup where executed, including unsuccessful phases. Evidence SHALL identify head, selection, runner, Node version, candidate digest where applicable, cache state, build/pack counts, and test ownership. Reporting SHALL not expose credentials or raw user content.

Acceptance SHALL compare representative unrelated, startup-sensitive, and conservative-full selections against recorded baselines, preserving all measured attempts and distinguishing cached and uncached setup. When hosted scheduling prevents the complete planned observation set, acceptance MAY proceed only through an explicit maintainer known-gap disposition that identifies every missing class/control; missing samples SHALL remain unperformed, SHALL NOT support a speedup or completed-performance claim, and SHALL NOT be converted into passing evidence or automatic completed-change archival. Structural ownership and failure-path checks SHALL be mandatory. Wall-clock improvement targets SHALL be reported as achieved or unmet, not enforced by increasing product budgets, shortening representative workloads, hiding failed attempts, or retrying until green.

#### Scenario: A startup job is slow
- **WHEN** a startup job takes substantially longer than its measured command launches
- **THEN** the evidence SHALL distinguish install and fixture phases from actual launch latency and cleanup

#### Scenario: An optimized partition fails
- **WHEN** a scope fails before the remaining scopes execute
- **THEN** completed and failing phase evidence SHALL be retained and unfinished work SHALL remain explicitly incomplete

#### Scenario: A speedup is claimed
- **WHEN** the maintainer reviews optimization acceptance
- **THEN** evidence SHALL include before/after elapsed and runner-cost measurements, selection and ownership differences, cache conditions, and all failed attempts
- **AND** the complete non-PR suite SHALL retain every prior semantic scenario and supported platform/runtime owner

### Requirement: Same-head failed-job reruns reuse only authoritative successes
Development validation SHALL support GitHub's failed-jobs-only rerun for an unchanged workflow run, head, and selection. A successful selected job from an earlier attempt of that same run MAY satisfy the rerun aggregate when that job was not rerun, while every job executed in the current attempt SHALL use its current-attempt result. Evidence names SHALL remain distinct across attempts. A different head, run, workflow selection, or changed ownership identity SHALL invalidate reuse. Semantic test failures SHALL never be retried automatically or converted to success, and every failed attempt SHALL remain visible.

#### Scenario: One job has an infrastructure failure
- **WHEN** one selected job fails for an infrastructure reason while other selected jobs pass and the maintainer requests failed-jobs-only rerun without changing the head
- **THEN** only the failed job and its dependent aggregate MAY execute again
- **AND** the aggregate SHALL accept unchanged exact-head successes from earlier attempts of that run after the rerun succeeds

#### Scenario: A rerun job fails again
- **WHEN** a selected job executes in the current attempt and remains unsuccessful
- **THEN** its older success or another run SHALL NOT override the current-attempt failure
- **AND** the aggregate SHALL fail

#### Scenario: The pull-request head or selection changes
- **WHEN** a new commit, workflow authority, owner registry, or selection identity differs from the recorded success
- **THEN** prior-attempt evidence SHALL NOT satisfy the new validation
- **AND** every scope selected for the new identity SHALL run again

#### Scenario: A semantic assertion fails
- **WHEN** a test reports a product or policy assertion failure
- **THEN** validation SHALL retain the failure without automatically rerunning the test
- **AND** a maintainer-requested same-head rerun SHALL remain distinguishable from first-attempt success

### Requirement: Ordinary validation evidence is proportionate to its authority
Checkout-bound type, architecture, governance, unit, and smoke jobs SHALL bind their outcome to the authoritative head, run, selection, and logical scope without reproducing package-level content receipts. Exact build, candidate, installation, and digest receipts SHALL remain mandatory where a gate consumes emitted or packed artifacts or supplies publication authority. The aggregate SHALL rely on trusted Actions job conclusions plus only the additional evidence needed to establish selected scope identity and exact-artifact contracts.

#### Scenario: Checkout-bound unit job completes
- **WHEN** a PR-core job reads only the checked-out source and produces no artifact consumed as a publication candidate
- **THEN** its result SHALL be bound to the current head and selected scope without hashing the complete build or package surface

#### Scenario: Exact package is consumed
- **WHEN** startup, package, update, compatibility, preview, or release validation consumes emitted or packed candidate bytes
- **THEN** compatible build and package identity SHALL be verified before those bytes satisfy the gate
- **AND** ordinary checkout-bound success SHALL NOT substitute for exact-package evidence

#### Scenario: Aggregate evidence is unavailable or contradictory
- **WHEN** trusted job status, scope identity, or required exact-artifact evidence is missing, stale, ambiguous, or contradictory
- **THEN** the required aggregate SHALL fail rather than infer success

### Requirement: Integration owners declare pull-request or exhaustive cadence
Every retained integration owner SHALL declare exactly one execution cadence: `pull-request` or `exhaustive`. Ordinary bounded `pull_request` and manual Development validation SHALL schedule only pull-request owners. Impact selection SHALL choose affected pull-request owners, while conservative ordinary selection SHALL choose all pull-request owners. Only a trusted-CI-created repair pull request carrying valid provenance for a failed Full regression SHALL additionally invoke the shared Full regression implementation inside its PR workflow, including all exhaustive owners. This explicit complete-regression selection SHALL be an exception to ordinary cadence deferral, not a reclassification or deletion of owners. Exhaustive owners SHALL remain mandatory in manual and scheduled Full regression and nightly/stable release validation and SHALL never be inferred from focused PR coverage. An owner whose assertion is wall-clock timing on shared runners SHALL remain exhaustive, with its deterministic contracts covered by pull-request owners.

A malformed, missing, or unknown cadence declaration SHALL block ordinary selection rather than default an exhaustive owner into or out of validation. Selection evidence SHALL distinguish ordinary selected owners, ordinary cadence-deferred owners, and owners executed by an eligible generated repair's complete regression. The protected aggregate SHALL require every selected PR owner and any selected complete-regression result. It SHALL neither wait for nor accept evidence from an owner proven deferred by both selections.

#### Scenario: Validation-authority pull request is conservative
- **WHEN** a human-authored PR changes Development workflow, complete-regression selection, or aggregation authority
- **THEN** trusted ordinary classification SHALL retain conservative pull-request coverage
- **AND** PR-attached Full regression SHALL remain unselected

#### Scenario: Ordinary release implementation changes
- **WHEN** a human-authored PR changes package, update, release, build, or publication code
- **THEN** affected ordinary deterministic contracts SHALL run
- **AND** exhaustive owners SHALL remain cadence-deferred until scheduled/manual Full regression or nightly/stable release validation

#### Scenario: Generated failed-regression repair is validated
- **WHEN** trusted CI creates a repair PR from a failed Full regression and its implementation is no longer planning-only
- **THEN** PR-attached Full regression SHALL execute pull-request and exhaustive owners on their retained targets before integration

#### Scenario: Unrelated ordinary implementation is validated
- **WHEN** trusted classification proves that a PR lacks valid generated failed-Full-regression repair provenance
- **THEN** exhaustive owners SHALL remain explicitly cadence-deferred and ordinary bounded validation SHALL not wait for them

#### Scenario: Full regression is requested
- **WHEN** a maintainer dispatches Full regression
- **THEN** all pull-request and exhaustive owners SHALL execute with their retained assertions and targets

#### Scenario: Nightly or stable validation runs
- **WHEN** nightly or stable release validation expands complete coverage
- **THEN** all exhaustive owners SHALL execute against the selected exact package
- **AND** a failed exhaustive owner SHALL block that workflow's publication authority

#### Scenario: Cadence policy is malformed
- **WHEN** an integration owner omits cadence or declares an unsupported value
- **THEN** selection and aggregation SHALL fail closed
- **AND** no omitted owner SHALL be interpreted as safely deferred

### Requirement: Pull-request latency targets are measured by owner and scope
Development validation SHALL report setup, per-scope invocation, selected-job execution, aggregate processing, and runner execution critical-path durations without counting pre-runner queue delay as test execution. Acceptance evidence for this change SHALL include representative owned-path and conservative validation runs. The ordinary PR target SHALL be no more than eight minutes of runner execution critical path and no more than five minutes for any individual PR-required scope invocation.

These targets SHALL be evaluated by removing or optimizing inappropriate work, not by increasing timeouts, shrinking representative workloads, caching mutable installed state, suppressing assertions, or retrying failures. Hosted variance MAY be reported, but an observation above either target SHALL remain an unmet result and SHALL not support a completed speedup claim.

#### Scenario: Conservative PR timing is inspected
- **WHEN** a validation-authority change selects complete pull-request coverage
- **THEN** evidence SHALL identify every owner and scope on the critical path with separate setup and invocation durations
- **AND** it SHALL report the eight-minute and five-minute targets as met or unmet

#### Scenario: Exhaustive work is deferred
- **WHEN** the published-predecessor owner is excluded from an ordinary PR by cadence
- **THEN** evidence SHALL identify cadence deferral rather than classify the owner as unrelated, skipped unexpectedly, or passed

#### Scenario: A PR-required scope exceeds its target
- **WHEN** an individual selected PR scope takes more than five minutes or the runner execution critical path exceeds eight minutes
- **THEN** acceptance evidence SHALL report the target as unmet
- **AND** validation SHALL retain the original assertions, timeout, first-attempt outcome, and failure visibility

### Requirement: Publication lanes deduplicate exact-package installation
When one preview, nightly, or stable publication platform/runtime lane selects multiple exact-package owners that consume the same candidate and require the same clean installed package, validation SHALL reuse a compatible downloaded candidate receipt without repacking and SHALL prepare that immutable installation once for the lane. The lane-local receipt SHALL bind the downloaded candidate to the same exact build receipt used by validation. Each selected owner SHALL retain a distinct outcome, its declared assertions, and all applicable platform/runtime coverage. Validation SHALL record the preparation identity, count, duration, separate installation, proxy-synchronization, and installed-identity durations, candidate digest, and consuming owners, and SHALL fail closed if any consumer cannot prove it used that exact preparation.

Reusable preparation SHALL remain scoped to one lane and one exact candidate. It SHALL NOT cross platform, architecture, Node runtime, workflow run, run attempt, candidate digest, or installation-policy identity boundaries. Failure or cancellation of shared preparation SHALL fail every dependent owner and SHALL block publication without reporting an owner as passed or skipped.

#### Scenario: Package contracts and startup share one lane
- **WHEN** one publication lane selects package-contract and first-attempt startup owners for the same exact candidate
- **THEN** the lane SHALL reuse compatible downloaded candidate evidence and perform exactly one clean installed-package preparation for those owners
- **AND** startup SHALL execute immediately after preparation and before package-contract workload
- **AND** each owner SHALL execute once and report a separate result

#### Scenario: Downloaded candidate receipt is compatible
- **WHEN** a lane receives exact candidate bytes and source identity with a package receipt bound to that lane's exact build receipt
- **THEN** validation SHALL accept the existing candidate without invoking lane-local packing
- **AND** contradictory candidate, source, or build evidence SHALL remain fail-closed

#### Scenario: Preparation identity differs
- **WHEN** selected consumers differ by candidate digest, platform, architecture, Node runtime, run attempt, or installation-policy identity
- **THEN** validation SHALL NOT reuse the installed package across that boundary
- **AND** every required lane SHALL retain its own verified preparation

#### Scenario: Shared preparation fails
- **WHEN** the lane's exact-package installation fails, is cancelled, or produces missing or contradictory identity evidence
- **THEN** every dependent owner SHALL remain unsuccessful
- **AND** publication SHALL be blocked before npm is contacted

#### Scenario: Publication timing is inspected
- **WHEN** validation evidence for a lane selecting multiple exact-package consumers is reviewed
- **THEN** it SHALL show one preparation count and duration plus each consuming owner's independent duration and outcome
- **AND** a repeated equivalent clean install SHALL fail the structural regression contract rather than being hidden in aggregate elapsed time

#### Scenario: Preparation cost is attributed
- **WHEN** a lane records its shared exact-package preparation
- **THEN** the receipt and evidence SHALL show the installation, proxy-synchronization, and installed-identity durations separately
- **AND** the total SHALL remain the single preparation duration already reported

### Requirement: Startup budget enforcement is declared per channel
Validation SHALL select startup budget enforcement through the `STARTUP_BUDGET_ENFORCEMENT` contract. The value `fail` SHALL enforce the declared budgets by failing the gate on an overrun. The value `record` SHALL retain every measurement, record each overrun as evidence and as a run annotation, and allow the run to succeed. An absent or unrecognized value SHALL mean `fail`.

Development publication and ordinary pull-request validation SHALL run in `record` mode. Nightly publication, stable publication, and complete regression SHALL run in `fail` mode, and the complete regression workflow SHALL state its mode explicitly rather than rely on the default. No mode SHALL reduce the measured profiles or launch kinds, retry a measurement, or suppress a launch that never became input-ready.

The startup performance evidence SHALL name the enforcement mode it was produced under and SHALL list every recorded violation with its profile, launch kind, measured elapsed time, applicable budget, and dominant phases. Publication lanes SHALL upload that evidence with their platform outcomes and SHALL summarize each measurement, its budget, and its status in the run summary.

#### Scenario: A development preview lane records an overrun
- **WHEN** a publication lane resolves the development channel and an exact packaged launch exceeds its budget
- **THEN** the lane SHALL receive `record`, annotate the run, upload the violation with its platform outcomes, and succeed

#### Scenario: A publication lane enforces an overrun
- **WHEN** a publication lane resolves the nightly or stable channel and the same launch exceeds the same budget
- **THEN** the lane SHALL receive `fail` and block publication with the dominant measured phases

#### Scenario: A pull request measures startup
- **WHEN** the pull-request startup owner runs on a shared runner
- **THEN** it SHALL measure every declared scenario in `record` mode and SHALL NOT fail the required aggregate on a timing overrun alone

#### Scenario: The contract is unset
- **WHEN** the exact-package startup gate runs with no enforcement variable, an empty value, or an unrecognized value
- **THEN** it SHALL enforce the budgets

### Requirement: Shared exact-package installation is prepared and handed off explicitly
A publication or complete regression lane SHALL be able to perform its one shared exact-package installation as a separate command from the command that runs the owners consuming it, so the workflow can change runner state between them. The preparing command SHALL verify the existing build receipt when a verified install-time build is declared, SHALL verify the package receipt for the exact candidate, SHALL perform exactly one installation for the planned consumers, SHALL write one bounded handoff naming its schema, consumers, prepared paths, measured duration, and verified receipt, and SHALL run no other planned command.

The consuming command SHALL verify a supplied handoff against the same lane, candidate digest, installation policy, declared consumers, and installed bytes before any owner executes, and SHALL record the preparation as a verified shared preparation carrying the duration the preparing command measured. A malformed handoff, a handoff that contradicts the plan, and a handoff that fails verification SHALL each produce one failed preparation outcome and SHALL NOT cause a second installation. The consuming command SHALL retain ownership of removing the prepared installation at the end of the run whether it prepared that installation or received it. When no handoff is supplied, preparation SHALL remain lazy and unchanged.

#### Scenario: A lane prepares before changing runner state
- **WHEN** a publication or complete regression lane prepares the exact package as its own step
- **THEN** exactly one installation SHALL occur for the planned consumers
- **AND** the lane SHALL be free to change runner protection state before the consuming command starts

#### Scenario: A consuming command receives a valid handoff
- **WHEN** the consuming command verifies a handoff for its own lane, candidate, policy, and consumers
- **THEN** it SHALL record one verified shared preparation with the measured preparation duration
- **AND** every consuming owner SHALL still verify the installation around its own invocation and report a separate result

#### Scenario: A handoff is malformed or unverifiable
- **WHEN** a supplied handoff is malformed, contradicts the plan, or fails exact-package verification
- **THEN** the run SHALL record one failed preparation outcome and stop before any owner executes
- **AND** it SHALL NOT perform a second installation

#### Scenario: No handoff is supplied
- **WHEN** a local run or ordinary pull-request validation runs the tier without a handoff
- **THEN** preparation SHALL remain lazy, bound to the first consuming invocation, and otherwise unchanged

### Requirement: Publication failures are reported readably
When an explicitly dispatched publication fails, the maintainer command that requested it SHALL report the failed workflow job names and the failure messages those jobs recorded, bounded to a short list, and SHALL exit non-zero with that report rather than an uncaught process stack trace. It SHALL print the workflow run identifier and its URL as soon as the run is known so the maintainer can follow progress. A publication that succeeds SHALL keep its existing output.

The publication workflow final result job SHALL, when the selected outcome was not reached, write to the run summary the failed jobs and, for each validation lane whose outcome evidence was uploaded, the invocations that exited non-zero and any recorded startup budget violations. The summary SHALL remain informational; the existing outcome requirement SHALL keep deciding the job result.

#### Scenario: A validation lane fails during a requested publication
- **WHEN** the maintainer publication command observes the workflow run finish unsuccessfully
- **THEN** the command SHALL print the failed job names and their recorded failure messages and exit non-zero without a stack trace

#### Scenario: The run is created
- **WHEN** the publication command identifies the workflow run responsible for the requested version
- **THEN** it SHALL print the run identifier and URL before waiting on it

#### Scenario: The result job summarizes a failed run
- **WHEN** the publication result job runs after a package, validation, or publish job failed
- **THEN** its summary SHALL list the failed jobs and the non-zero validation invocations from uploaded lane evidence
- **AND** the job SHALL still fail through the unchanged outcome requirement

#### Scenario: Publication succeeds
- **WHEN** the run completes successfully
- **THEN** the command output and result summary SHALL be unchanged apart from the earlier run URL line

### Requirement: A failed nightly regression proposes its fix
When a `Full regression` run on `develop` or a scheduled `Publish` validation completes with a failure, one trusted workflow SHALL open or refresh a draft pull request against `develop` whose body carries the failure evidence: the failed owners per platform and Node lane, the test files those owners retain, a bounded excerpt of the failing test output, the `develop` commits since the last successful run of the same workflow, and a link to the failed run. The pull request SHALL start from the failed head, SHALL contain only an OpenSpec change scaffold for the fix, and SHALL follow the ordinary implementation-bound delivery rules from there. The generated scaffold SHALL include bounded machine-readable source provenance naming the workflow, run, event, conclusion, source head, and candidate identity.

After implementation, a repair candidate created from a failed Full regression SHALL receive complete regression inside its PR workflow and SHALL be handed off only after that complete suite and the other required checks succeed on the final candidate head. A repair created only from a scheduled Publish failure SHALL retain ordinary selected PR validation and the publication pipeline's independent complete validation, but SHALL NOT select PR-attached Full regression solely because it is a triage candidate. A separate manual dispatch SHALL NOT be required in addition to successful selected PR-attached complete regression. Pre-finalization investigation evidence MAY remain in design.md, while final-head run identity and outcomes SHALL be bound through PR checks, Actions artifacts, and the handoff without a self-invalidating evidence-only commit.

A run on any other branch, including manually dispatched or PR-attached Full regression on a fix candidate, SHALL open or refresh nothing. The same trusted triage workflow SHALL continue to evaluate every eligible completed `develop` run, failed or not, for a persistent startup-budget overrun from that run and the two previous completed runs of the same workflow; a persistent overrun SHALL be proposed as a failure of `package-startup` with the three measurements per lane, profile, and launch kind under its own candidate key, while a single overrun SHALL be recorded in the triage report and summary only. The proposal SHALL NOT re-run validation, edit `develop`, mark the pull request ready, merge, or change the nightly failure's own visibility or publication authority.

#### Scenario: Nightly regression fails on one lane
- **WHEN** the scheduled Full regression fails with owners `a` and `b` on Windows Node 24 and passes elsewhere
- **THEN** a draft pull request `fix/nightly-regression-<date>` SHALL exist with `a` and `b`, their test files, the lane, the log excerpt, the suspect commits, the run link, and generated source provenance
- **AND** its branch SHALL add only the OpenSpec planning scaffold

#### Scenario: The same owners fail again
- **WHEN** a later nightly fails with the same failed owner set while that triage pull request is open
- **THEN** the workflow SHALL append the new run's evidence and refresh generated provenance in the existing pull request and change instead of opening another

#### Scenario: A lane fails before producing owner evidence
- **WHEN** a lane fails in installation, packing, or runner preparation and uploads no owner outcomes
- **THEN** the evidence SHALL name the failed job and its bounded final log lines and SHALL record the owner set as an orchestration failure

#### Scenario: Scheduled publication fails
- **WHEN** a scheduled Publish run creates a repair candidate
- **THEN** that candidate SHALL retain ordinary selected PR validation without PR-attached Full regression unless valid failed-Full-regression provenance is later added by trusted triage

#### Scenario: Manual publication fails
- **WHEN** a manually dispatched Publish run fails
- **THEN** no triage pull request SHALL be opened or refreshed

#### Scenario: The fix is proven before hand-off
- **WHEN** a generated failed-Full-regression repair's finalized candidate is handed to the maintainer
- **THEN** its PR-attached Full regression SHALL have succeeded on that exact head across every required lane
- **AND** the PR checks, evidence, and handoff SHALL identify the run and head without requiring an additional dispatch or committed run-ID edit

#### Scenario: A candidate branch runs Full regression
- **WHEN** manually dispatched or PR-attached Full regression on a repair branch fails
- **THEN** no triage pull request SHALL be opened or refreshed
- **AND** that failure SHALL remain visible as candidate evidence and SHALL block its applicable handoff gate

#### Scenario: A green nightly carries a persistent startup overrun
- **WHEN** the scheduled Full regression succeeds and one lane, profile, and launch kind has exceeded its budget on this and the two previous `develop` runs
- **THEN** the triage SHALL open or refresh a candidate whose key names `package-startup` and whose evidence lists the three measurements
- **AND** the candidate SHALL use ordinary PR validation because its source Full regression did not fail

#### Scenario: A nightly carries one startup overrun
- **WHEN** a measurement exceeds its budget on this run but not on both previous `develop` runs
- **THEN** the triage SHALL record the overrun in its report and summary and SHALL open or refresh nothing for it

### Requirement: Repair and publishing pull requests select visible complete regression
Development validation SHALL select PR-attached Full regression only for a nightly-repair pull request that the trusted regression-triage automation created from a failed Full regression. Selection SHALL use base-controlled policy, immutable configured GitHub App author identity, generated source-run provenance, complete changed and renamed-from paths, current PR metadata, and supported lifecycle association. A matching branch, title, OpenSpec identifier, body text, changed release/publishing path, unknown operational path, or label SHALL NOT select complete regression without that generated provenance. Release/publishing, build/prerequisite, shared-support, and validation-authority impact SHALL use ordinary Development selection and SHALL NOT independently select PR-attached Full regression. No PR label SHALL opt into or opt out of the complete suite.

Selection SHALL record the exact head, target baseline, input identity, decision, and reasons. Invalid PR identity, contradictory lifecycle data, or stale recorded selection SHALL block validation. Missing or invalid generated-repair provenance SHALL not grant complete-regression selection; ordinary validation SHALL still fail closed under its existing impact and lifecycle policy rather than treating the missing full suite as successful evidence.

Generated repair drafts SHALL not launch complete regression, including after they acquire implementation changes. A ready generated repair SHALL wait for version-3 finalization and then expose complete-regression checks on the finalized exact head. Head, lifecycle, provenance, and readiness changes SHALL trigger fresh evaluation. Human-authored and other automation-authored PRs SHALL retain ordinary bounded validation regardless of matching names or changed paths.

#### Scenario: Repair remains draft while code is developed
- **WHEN** an App-created failed-Full-regression repair draft acquires approved executable implementation changes with valid provenance
- **THEN** its full-regression selector and native lanes SHALL remain unscheduled
- **AND** the PR SHALL remain draft and ineligible for integration

#### Scenario: Planning scaffold is proposed
- **WHEN** trusted triage creates a draft containing only planning artifacts and failed-run provenance
- **THEN** it SHALL retain lightweight planning behavior without scheduling exhaustive jobs

#### Scenario: Ready repair is finalized
- **WHEN** an eligible generated failed-regression repair is marked ready and trusted finalization publishes its finalized head
- **THEN** that exact finalized head SHALL expose the selected complete-regression checks
- **AND** all native lanes SHALL remain required through the protected aggregate

#### Scenario: Publishing preparation changes
- **WHEN** a human-authored PR changes a release build prerequisite, packaging input, publication workflow, or validation policy
- **THEN** ordinary impact-selected or conservative Development validation SHALL run after the PR becomes ready
- **AND** PR-attached Full regression SHALL remain unselected

#### Scenario: Human creates a lookalike repair
- **WHEN** a human creates a matching `fix/nightly-regression-*` branch, OpenSpec association, title, body, or provenance-shaped file
- **THEN** immutable author and generated-origin checks SHALL keep PR-attached Full regression unselected

#### Scenario: App creates unrelated work
- **WHEN** the configured App authors a PR without valid failed-Full-regression source provenance
- **THEN** App identity alone SHALL NOT select complete regression

#### Scenario: Maintainer applies the former opt-in label
- **WHEN** `ci:full-regression` or another label is added to an ordinary PR
- **THEN** the label SHALL NOT trigger Development validation or alter complete-regression selection
- **AND** only a later qualifying generated failed-regression provenance change MAY select the suite

#### Scenario: A path or repair marker is moved
- **WHEN** trusted finalization moves the eligible repair's active OpenSpec path into its archive
- **THEN** author, source provenance, and renamed/history evidence SHALL preserve complete-regression selection on the final head

#### Scenario: Opt-in is removed
- **WHEN** `ci:full-regression` or another label is removed from any PR
- **THEN** removal SHALL NOT trigger Development validation or alter complete-regression selection
- **AND** current head, body, base, readiness, and provenance identity SHALL retain their existing freshness rules

#### Scenario: Source provenance is not a failed Full regression
- **WHEN** generated provenance identifies a successful or cancelled Full regression, a Release run, an unsupported event, or an unverifiable source
- **THEN** PR-attached Full regression SHALL remain unselected
- **AND** ordinary required validation and independent release/nightly gates SHALL retain their authority

### Requirement: Selected full regression participates in the protected PR aggregate
The PR workflow SHALL call a shared, non-publishing complete-regression implementation that also serves scheduled and manual Full regression. Its existing complete Windows Node 22/24, Linux Node 24, and macOS Node 24 coverage SHALL appear in the PR Checks rollup with stable per-lane names. Execution SHALL validate the explicit PR head rather than accidentally certifying only a synthetic merge ref. Artifacts and outcomes SHALL bind source, selection, target, run, attempt, and lane identity.

The existing `Development validation required` aggregate SHALL require the complete current selected result in addition to all other mandatory checks. Failed, cancelled, missing, stale, or unexpectedly skipped required work SHALL block integration. A skip SHALL be acceptable only with trustworthy current selection proving full regression unselected. Other workflow runs SHALL not substitute for this PR execution. PR jobs SHALL not gain write credentials, publication secrets, or OIDC publication authority. Scheduled/manual entry points, eligible triage behavior, and publication's own exact-byte gates SHALL remain independent and intact.

#### Scenario: Complete PR validation succeeds
- **WHEN** every selected native lane and all other mandatory gates succeed for the final PR head and selection
- **THEN** their checks SHALL be visible in the PR and the stable protected aggregate MAY succeed

#### Scenario: One required lane does not succeed
- **WHEN** a selected full lane fails, is cancelled, is absent, or is unexpectedly skipped
- **THEN** the protected aggregate SHALL remain unsuccessful even if ordinary PR checks pass

#### Scenario: Successful evidence belongs elsewhere
- **WHEN** evidence belongs to another head, target, selection, run, or incompatible attempt
- **THEN** the aggregate SHALL reject it rather than reuse an earlier or independently dispatched success

#### Scenario: Scheduled or manual full validation is requested
- **WHEN** an existing scheduled trigger or explicit Full regression dispatch runs
- **THEN** it SHALL retain the named workflow entry point, full coverage, non-publishing authority, and compatible evidence through the shared implementation

#### Scenario: PR work is superseded
- **WHEN** a new PR head supersedes an active full run
- **THEN** the old PR work MAY be cancelled and SHALL not certify the new head
- **AND** PR cancellation SHALL not cancel an unrelated scheduled/manual run or its own caller

### Requirement: Complete ordinary regression bounds worker fanout
The complete non-physical validation plan SHALL retain file parallelism for its ordinary Vitest partition while enforcing an explicit maximum of two workers. The bound SHALL be applied by the authoritative `full-release` plan used by scheduled and manual Full regression, selected pull-request Full regression, and complete release validation. Plan and outcome evidence SHALL identify the bounded-parallel execution class and exact worker maximum.

The worker bound SHALL NOT remove or reclassify tests, suppress output, add retries, relax assertion or timeout behavior, alter isolated/resource-sensitive/package partitions, or reduce any supported platform/runtime lane. A test failure, process error, or existing timeout expiry SHALL continue to fail its owner and aggregate.

#### Scenario: Complete validation plans its ordinary partition
- **WHEN** any caller expands `full-release`
- **THEN** the complete ordinary Vitest invocation SHALL retain file parallelism with at most two workers
- **AND** its evidence SHALL record the bounded-parallel class, worker maximum, timeout source, retry count, and per-file timing source

#### Scenario: Complete coverage is retained under the worker bound
- **WHEN** the bounded ordinary partition executes
- **THEN** every test selected before the bound SHALL still execute exactly once in its applicable partition and native lane
- **AND** existing assertions, timeouts, isolated owners, resource-sensitive owners, package owners, and failure semantics SHALL remain unchanged

### Requirement: Pull-request validation waits for a reviewable candidate
Development validation SHALL schedule no test suite while a pull request is draft. When an ordinary pull request becomes ready for review, one readiness decision SHALL permit its existing impact-selected validation. When a version-3 implementation-bound pull request becomes ready while its OpenSpec change is still active, base-controlled policy SHALL defer test selection until trusted finalization has updated the pull-request metadata with the archive and acceptance-manifest paths. The finalized exact head SHALL then receive every existing selected validation scope and the stable protected aggregate.

The readiness decision SHALL execute without pull-request-head code or dependency installation, SHALL report an explicit reason, and SHALL fail closed for malformed lifecycle metadata. For pull-request events, readiness SHALL read current mutable body and draft metadata through trusted read-only GitHub authority and SHALL use it only when the current pull-request number, head, and base still equal the immutable event identity. Drifted, unavailable, or invalid current metadata SHALL fail visibly. Draft and pre-finalization runs SHALL NOT emit a misleading successful `Development validation required` aggregate. The absence of that exact-head aggregate SHALL keep the candidate ineligible for integration. Conversion back to draft and later ready-head changes SHALL continue to cancel superseded PR validation; no prior-head result SHALL be reused.

Manual Development dispatch, scheduled/manual Full regression, release validation, publication gates, OpenSpec finalization, and post-merge verification SHALL retain their independent triggers and authority. Once readiness permits Development validation, owner selection, native lanes, assertions, coverage, retries, timeouts, permissions, evidence binding, and failure semantics SHALL remain unchanged.

#### Scenario: Draft implementation receives pushes
- **WHEN** any draft pull request receives planning, implementation, body, or head changes
- **THEN** Development validation SHALL schedule no test suite or protected aggregate
- **AND** the draft SHALL gain no acceptance or integration authority

#### Scenario: Ordinary pull request becomes ready
- **WHEN** a pull request without an active version-3 implementation association becomes ready for review
- **THEN** its existing impact-selected Development validation SHALL start
- **AND** the successful current-head protected aggregate SHALL remain required for integration

#### Scenario: Version-3 implementation becomes ready
- **WHEN** a version-3 implementation pull request becomes ready while its metadata still identifies an active change without finalized delivery paths
- **THEN** Development validation SHALL report that finalization is pending without scheduling test suites
- **AND** no `Development validation required` aggregate SHALL certify that pre-finalization head

#### Scenario: Finalization publishes the candidate
- **WHEN** trusted finalization pushes the finalized version-3 head and records both emitted paths in the implementation metadata
- **THEN** the existing pull-request event SHALL start Development validation for that exact head
- **AND** every selected job and protected aggregate SHALL retain its prior requirements

#### Scenario: Finalization events arrive out of order
- **WHEN** a same-head pull-request event carries pre-finalization body metadata after trusted finalization has recorded the finalized paths on the current pull request
- **THEN** readiness SHALL classify the current body bound to that unchanged event head
- **AND** event ordering SHALL NOT leave the finalized candidate deferred without selected validation

#### Scenario: Ready work is superseded
- **WHEN** a ready pull request receives another head or body change or is converted back to draft
- **THEN** stale in-progress Development validation MAY be cancelled
- **AND** only an eligible latest ready head MAY produce merge-authorizing evidence

#### Scenario: Lifecycle metadata is malformed
- **WHEN** a ready pull request contains malformed or contradictory implementation metadata
- **THEN** base-controlled readiness SHALL fail visibly without executing pull-request test suites
- **AND** the protected aggregate SHALL remain unavailable rather than treating the candidate as ordinary or finalized

#### Scenario: Current readiness metadata is unavailable
- **WHEN** trusted readiness cannot read valid current pull-request metadata for the event head
- **THEN** readiness SHALL fail visibly without executing pull-request test suites
- **AND** the protected aggregate SHALL remain unavailable rather than trusting stale event metadata

### Requirement: The native terminal host is validated in CI rather than on workstations
Development validation SHALL own `native/terminal-host/**`, its run scripts and its provenance check through a deterministic pull-request-cadence validation owner. When the impact classifier selects that owner, CI SHALL build the crate on Windows x64 with pinned Rust and Zig toolchains, run its unit tests and non-interactive probes, and upload the built debug executable as a short-lived artifact. The owner's result SHALL participate in the protected development check. Changes that touch none of the owned paths SHALL NOT run the job. Until the crate builds on every complete-regression lane, its scope SHALL be excluded from `full-release`, so nightly Full regression and release gates SHALL NOT build it.

The crate's build script SHALL refuse to build on a Windows host outside CI unless the explicit `TERMINAL_HOST_LOCAL_BUILD=1` override is set. It SHALL fail before invoking Zig or fetching Zig packages, with a concise message naming the CI job and the override.

#### Scenario: A pull request changes the terminal host
- **WHEN** a pull request changes a file under `native/terminal-host/`
- **THEN** impact classification SHALL select the terminal-host owner
- **AND** CI SHALL build, unit-test and probe the crate on Windows x64
- **AND** the built executable SHALL be available as a workflow artifact
- **AND** a build, test or probe failure SHALL fail the protected development check

#### Scenario: A pull request does not touch the terminal host
- **WHEN** a pull request changes no terminal-host-owned path
- **THEN** the terminal-host job SHALL be reported as not selected and SHALL NOT build the crate

#### Scenario: A developer builds the crate locally on Windows
- **WHEN** `cargo test`, `cargo build` or `npm run test:terminal-host` runs on a Windows host without `CI` and without `TERMINAL_HOST_LOCAL_BUILD=1`
- **THEN** the build SHALL fail before invoking Zig
- **AND** the message SHALL name the CI job and the override
- **AND** no Zig package-cache entries SHALL be created by that attempt

#### Scenario: A developer explicitly overrides the guard
- **WHEN** the same build runs with `TERMINAL_HOST_LOCAL_BUILD=1`
- **THEN** the build SHALL proceed as it does in CI

### Requirement: Allowed prerequisite skips do not suppress required publication outcomes
A publication job that intentionally permits an upstream prerequisite to be skipped SHALL evaluate every subsequent required job explicitly. Post-publication smoke SHALL run only when its selected work requires publication and its direct plan, package, and publish dependencies all succeeded. Release completion SHALL run only when its direct plan, package, publish, and post-publication dependencies all succeeded. Both jobs SHALL evaluate their explicit predicates despite allowed transitive skips and SHALL remain ineligible after a failed, cancelled, or skipped direct prerequisite. The aggregate SHALL continue to reject missing or skipped post-publication smoke and completion whenever publication work was required.

#### Scenario: Development documentation review is intentionally skipped
- **WHEN** development publication skips its stable/nightly-only documentation review but package validation and registry publication succeed
- **THEN** the selected Windows, Linux, and macOS published-pair smoke lanes SHALL execute
- **AND** completion and the publication aggregate SHALL require those lanes to succeed

#### Scenario: A direct publication dependency fails
- **WHEN** package acquisition, publication, or required published-pair smoke fails, is cancelled, or is skipped unexpectedly
- **THEN** the next dependent publication job SHALL remain ineligible
- **AND** the aggregate SHALL fail rather than reinterpret the missing outcome as an allowed skip

### Requirement: Published-pair jobs use a repository-standard resolvable action pin
Every checkout in the release workflow SHALL use the same repository-established immutable action commit unless a separately reviewed coordinated upgrade changes all intended release references. A published-pair job SHALL fail policy validation before merge when it introduces a one-off checkout reference, even if that reference has the syntactic shape of a commit hash.

#### Scenario: A post-publication checkout contains a nonexistent one-off commit
- **WHEN** the published-pair job references a forty-character commit that differs from the established release-workflow checkout pin
- **THEN** focused workflow policy SHALL reject the candidate before publication
- **AND** no native installation lane SHALL depend on that unverified reference

#### Scenario: Published-pair installation begins
- **WHEN** publication and registry verification succeed for a newly numbered candidate
- **THEN** each selected native published-pair job SHALL resolve its immutable checkout action and execute the installation smoke steps

### Requirement: Published-pair lanes expose their native identity
Every post-publication native installation job SHALL display the selected platform and Node runtime from fields provided by the authoritative release matrix. A missing or invented matrix field SHALL NOT reduce the job name to an ambiguous empty label. Display identity SHALL NOT change runner selection, matrix breadth, artifact identity, or aggregate requirements.

#### Scenario: A native published-pair lane is inspected
- **WHEN** the release matrix expands a post-publication installation job
- **THEN** its Actions job name SHALL identify the selected platform and Node runtime
- **AND** a failure SHALL be attributable to its native lane without inspecting runner metadata through the API

### Requirement: Published-pair smoke uses the accepted installer target grammar

Post-publication native installation smoke SHALL invoke the published installer through the public target grammar accepted by that same package. A develop candidate SHALL use `--develop <exact-preview-version>` so the immutable registry-verified application version remains explicit. A release candidate SHALL use bare invocation. The harness SHALL NOT use removed `--version`, `--latest`, or `--next` target options, and focused pull-request policy SHALL reject those stale forms before another candidate is published.

#### Scenario: A develop published pair is exercised

- **WHEN** the registry serves a verified develop application/installer pair at `0.2.1-dev.605`
- **THEN** every selected native smoke lane SHALL invoke the installer with `--develop 0.2.1-dev.605`
- **AND** the installed manifest SHALL still be required to equal that exact version

#### Scenario: A release published pair is exercised

- **WHEN** the registry serves a verified release application/installer pair
- **THEN** every selected native smoke lane SHALL invoke the installer without a target selector

#### Scenario: Release smoke drifts to a removed target option

- **WHEN** the published-installer harness uses `--version`, `--latest`, or `--next` as an application target option
- **THEN** focused repository policy SHALL reject the candidate before publication

### Requirement: Complete native validation distinguishes semantic failure from bounded fixture release

Native complete-validation fixtures SHALL derive expected filesystem identities through the same platform filesystem semantics as the production contract when canonical identity is behaviorally required. A lexical session path MAY remain distinct where the product intentionally presents it, but tests SHALL NOT treat native aliases such as macOS `/var` and `/private/var` as different trust identities.

After a fixture has awaited all owned runtime and adapter disposal, test-only removal MAY retry operating-system transient `EBUSY`, `EPERM`, or equivalent recursive-removal release conditions within a fixed bound. It SHALL NOT retry the test body, semantic assertions, application operation, or process lifecycle. Exhausting the cleanup bound SHALL remain a failed test with the fixture path available in the error.

#### Scenario: macOS exposes a temporary-directory alias

- **WHEN** a trust fixture receives lexical `/var` but the filesystem resolves the project under `/private/var`
- **THEN** expected trust options and persisted identities SHALL use the canonical project and parent paths
- **AND** an intentionally lexical prompt heading SHALL remain lexical

#### Scenario: Windows briefly retains a disposed fixture path

- **WHEN** all runtime owners have completed disposal but recursive temporary-root removal receives a transient filesystem lock
- **THEN** test-only cleanup MAY retry removal within its fixed bound
- **AND** a persistent lock after the bound SHALL fail validation

#### Scenario: A semantic runtime assertion fails

- **WHEN** session resumability, extension preservation, disposal, or another runtime assertion fails
- **THEN** cleanup retry behavior SHALL NOT rerun or convert that assertion into success

### Requirement: Stable release notes are generated, editable, and manually accepted before publication
The release command SHALL resolve the previous verified stable release as an ancestor
of current authoritative `origin/develop`, enumerate uniquely associated merged pull
requests in that range, and deterministically generate one bounded user-facing body
for the selected stable target. It SHALL render escaped linked pull-request titles in
stable order under feature, fix, other-change, and breaking-change groups as
applicable while excluding release housekeeping. Version identity SHALL come from the
source-bound draft Release and target metadata rather than a redundant level-one
heading in the body. Missing, ambiguous, stale, or non-ancestral evidence SHALL stop
before draft or publication mutation.

The command SHALL create or safely reuse one unpublished draft GitHub Release bound
to the exact repository, target version, and authoritative source. A maintainer may
edit its body directly in the Releases UI. Native publication of that draft by an
authorized human SHALL be the acceptance of its body: trusted code SHALL snapshot the
published normalized body and digest and pack exactly that note.

Committed `docs/releases/*.md` files SHALL represent completed release history. The
stable package SHALL combine prior committed history with the published snapshot.
Publication SHALL require the package and the published Release to contain the same
body immediately before npm, and the manually merged reopening PR SHALL persist that
snapshot at `docs/releases/<target>.md` with the next-development version. Draft
creation, draft edits or saves, candidate validation, CI success, or automatic
integration SHALL NOT authorize npm publication.

#### Scenario: Prepare a stable release
- **WHEN** the maintainer selects stable `0.1.8` from current reviewed history after the previous stable ancestor
- **THEN** the command SHALL open an editable source-bound draft GitHub Release and start its validation without creating a notes PR

#### Scenario: Edit generated wording
- **WHEN** the maintainer changes headings or prose in the valid draft body and then publishes the draft
- **THEN** trusted publication SHALL validate and snapshot the edited Markdown for both package and GitHub Release content
- **AND** publishing unchanged generated wording SHALL also be accepted

#### Scenario: CI succeeds without manual merge
- **WHEN** the draft exists, is valid, and its candidate validation succeeded, but it has not been published
- **THEN** stable npm publication SHALL remain forbidden and no package, tag, public Release, or `master` movement SHALL occur

#### Scenario: The candidate changes outside release-note paths
- **WHEN** the published Release points at another source or target, is ambiguous, exceeds bounds, contains unsafe content, or differs from the snapshotted digest before npm
- **THEN** trusted publication SHALL reject it before npm without overwriting maintainer text and SHALL return the Release to draft

#### Scenario: Develop advances after review
- **WHEN** another change becomes authoritative `develop` after the draft was bound and before it is published
- **THEN** publication SHALL publish the bound source and its snapshot rather than retarget the draft to the newer tip

#### Scenario: Publication succeeds
- **WHEN** the exact approved source and published snapshot complete npm publication
- **THEN** the package and published GitHub Release SHALL contain the same approved body, and the reopening PR SHALL persist that body with the next-development version

### Requirement: A failed stable publication returns to draft before npm
When stable publication started by native Release publication fails or is cancelled,
a trusted recovery job SHALL run from default-branch code. It SHALL re-read both
target package versions from the registry and every attempt's npm upload steps. Only
when both packages are absent, no upload step started, and the complete job listing
was read SHALL it return the Release to draft and then delete the target tag, and
only when that tag is a lightweight tag at the Release's bound source. Tag deletion
SHALL use a contents-scoped token of the single release-automation App permitted to
bypass the tag ruleset. Otherwise it SHALL keep the published Release and tag, and
recovery SHALL rerun the failed jobs of the same run, whose final registry check makes
an already-published package an exact-byte no-op. Automation SHALL never move a tag,
delete a tag at another commit, or delete a tag once npm may have been reached.

Registry verification SHALL compare exact integrity and shasum for both packages,
verify the requested dist-tag, and keep polling for at least ten minutes before
failing an upload npm is still ingesting.

#### Scenario: Validation fails after the click
- **WHEN** an exact-package gate fails before either package upload starts
- **THEN** the Release SHALL return to draft and its unconsumed tag SHALL be deleted
- **AND** publishing the draft again SHALL start a new publication

#### Scenario: Publication is cancelled before npm
- **WHEN** the publication run is cancelled before either upload step starts
- **THEN** the recovery job SHALL return the Release to draft and delete its unconsumed tag

#### Scenario: An upload started but npm does not yet serve it
- **WHEN** an npm upload step ran and registry verification timed out while npm is still ingesting
- **THEN** the recovery job SHALL keep the Release and tag and direct the maintainer to confirm the registry and rerun the failed jobs

#### Scenario: One package reached npm
- **WHEN** either target package version exists on npm after a failure
- **THEN** the Release and tag SHALL stay and a rerun of the same run's failed jobs SHALL verify existing bytes and publish only what is missing

#### Scenario: The tag does not match the bound source
- **WHEN** the target tag points at another commit or is annotated
- **THEN** the recovery job SHALL fail without deleting or moving it

#### Scenario: Recovery runs again
- **WHEN** the recovery job reruns after it already returned the Release to draft and deleted the tag
- **THEN** it SHALL succeed without further mutation

### Requirement: Publication wrappers satisfy the reusable permission envelope

Every trusted repository workflow that calls the reusable publisher SHALL grant a caller permission ceiling sufficient for every nested job declared by that publisher, because GitHub validates the complete reusable-workflow graph before evaluating channel-specific job conditions. The reusable publisher SHALL continue to define narrower workflow-level defaults and explicit job-level overrides so the caller ceiling does not grant write authority to jobs that do not request it. Focused repository policy SHALL reject a known publication wrapper whose declared ceiling cannot instantiate the reusable publisher.

#### Scenario: Development publication calls the shared publisher

- **WHEN** the trusted default-branch `develop.yml` wrapper dispatches the reusable publisher in development mode
- **THEN** GitHub SHALL accept the reusable-workflow call and create its selected jobs rather than end with a startup failure caused by nested permission declarations
- **AND** stable-only write-scoped jobs SHALL remain skipped while executing development jobs retain their declared narrower permissions

#### Scenario: A publication wrapper loses a required permission

- **WHEN** a repository wrapper that calls `publish.yml` grants less authority than any nested publisher job statically requests
- **THEN** focused workflow policy SHALL fail before that wrapper can be merged

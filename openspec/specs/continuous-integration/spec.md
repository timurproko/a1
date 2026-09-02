# Continuous Integration Specification

## Purpose

Defines proportionate automated validation: fast checks during development, package gates for previews, and the complete suite only for stable releases.

## Requirements

### Requirement: Validation effort matches the change and the channel
Automated validation SHALL scale with what is being shipped. Documentation and specification changes SHALL require no product build or product test execution, but SHALL run every lightweight governance consistency check whose scanned inputs they change; OpenSpec changes SHALL also pass strict OpenSpec validation. Pull requests into `develop` SHALL require the ordinary fast code tier and architecture checks, SHALL check documentation policy only for policy-relevant modified, newly added, and renamed-to files, and SHALL select rendering evidence according to classified rendering impact. Preview publication SHALL additionally require exact-package gates on every supported platform. Stable publication SHALL require the complete automated suite on every supported platform. The scheduled nightly workflow SHALL run one full tracked-repository documentation review against its authoritative `origin/develop` source before publication can succeed.

#### Scenario: Docs-only pull request
- **WHEN** every changed path is documentation, an OpenSpec artifact, a Markdown file, `LICENSE`, or `.gitignore`
- **THEN** the required development check SHALL avoid product builds and tests, run strict OpenSpec validation when applicable, and run docs-sensitive governance consistency checks

#### Scenario: Code pull request targets develop
- **WHEN** a pull request changes any non-documentation path
- **THEN** validation SHALL run the ordinary fast tier, architecture checks, changed-file documentation governance, and any rendering scope selected from the complete pull-request impact
- **AND** the required aggregate check SHALL gate the merge

#### Scenario: Preview candidate is built
- **WHEN** a preview is published to `next`
- **THEN** validation SHALL run the fast tier and exact packed-candidate gates (package content, clean install) on Windows, Linux, and macOS without requiring the complete suite

#### Scenario: Stable candidate is certified
- **WHEN** a version is published to `latest`
- **THEN** the complete automated suite SHALL pass against the exact final-version package bytes on Windows, Linux, and macOS before publication

#### Scenario: Scheduled nightly source is selected
- **WHEN** the nightly publication workflow resolves the authoritative `origin/develop` commit
- **THEN** one platform-independent job SHALL inspect documentation governance across every tracked policy-relevant file at that exact commit
- **AND** the platform validation matrix SHALL not repeat the same complete documentation review

### Requirement: Development validation impact is classified deterministically
The development workflow SHALL derive one machine-readable validation selection from the complete merge-base-to-head change, including additions, modifications, deletions, rename sources, and rename destinations. Rendering impact SHALL use transitive production reachability from declared rendering evidence entry points together with explicit invalidators for dynamically loaded resources, terminal/package identity, validation configuration, and evidence infrastructure. Classification SHALL compare sufficient base and head state to recognize removed or renamed dependencies. An unavailable diff, unresolved dependency, unsupported changed input, or classifier failure SHALL select the conservative applicable scope rather than silently skip validation.

#### Scenario: Changed source is transitively rendered
- **WHEN** a changed production file is reachable from a declared rendering evidence entry point through direct or transitive dependencies
- **THEN** the classifier SHALL select rendering evidence and record at least one bounded dependency reason

#### Scenario: Unrelated foundation changes
- **WHEN** every changed code path is outside the rendering dependency surface and no rendering invalidator changed
- **THEN** the classifier SHALL select no rendering scope
- **AND** the ordinary fast and architecture gates SHALL still run

#### Scenario: Reachable dependency is deleted or renamed
- **WHEN** a rendering-reachable file in the merge-base revision is deleted or renamed
- **THEN** the classifier SHALL recognize its base-revision impact even when the path is absent from the head graph

#### Scenario: Classification cannot prove safety
- **WHEN** the complete diff or dependency classification cannot be obtained or contains an unclassified relevant input
- **THEN** development validation SHALL fail closed to the full rendering scope
- **AND** the reason SHALL be visible in machine-readable and human-readable evidence

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
Every modular development gate SHALL emit its selected scopes, classification tier, changed inputs, bounded reasons, fallback decisions, elapsed time, and result in machine-readable evidence and a concise workflow summary. The required aggregate SHALL bind those outcomes to the current pull-request head and SHALL reject a missing, stale, unsuccessful, or unexpectedly skipped required scope.

#### Scenario: Maintainer inspects a rendering selection
- **WHEN** a pull request selects `smoke` or `full` rendering evidence
- **THEN** the workflow summary SHALL identify the changed input and classification reason that selected it

#### Scenario: Required modular result is stale
- **WHEN** a modular job result belongs to an older pull-request head or a different classifier result
- **THEN** the aggregate required check SHALL fail

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
A published package SHALL be packed once for its final version, validated in that
exact form, and uploaded without rebuilding. The publisher SHALL verify the package
digest before uploading it, and SHALL verify that what it uploads is what the
validation ran against.

#### Scenario: Published input differs
- **WHEN** the tarball offered for publication differs by digest from the package that was validated
- **THEN** publication SHALL fail before contacting npm

#### Scenario: The publisher is inspected
- **WHEN** the publishing job is read
- **THEN** it SHALL contain no dependency installation, build, or packing step

### Requirement: The complete suite remains available on demand
The complete non-physical automated suite SHALL remain runnable locally (`npm run test:full`) and through manual workflow dispatch, so a maintainer can widen validation when a change feels risky. Routine development SHALL NOT require it.

#### Scenario: Maintainer requests full validation
- **WHEN** the maintainer dispatches the full-regression workflow or runs the full tier locally
- **THEN** every non-physical scope SHALL execute and report per-scope timing and outcomes

### Requirement: Publication follows from what was pushed
Publication SHALL use one workflow whose source is the exact current `origin/develop`
commit. It SHALL start nightly or by explicit dispatch; a push or tag alone SHALL NOT
publish. A manual request SHALL provide the intended channel and exact source SHA and
SHALL fail if that SHA is no longer authoritative `develop`.

Nightly and explicit development publication SHALL derive one immutable preview
version from the unique merged pull request associated with the selected source and
publish or verify npm `next`. Stable publication SHALL require a final version and
explicit stable dispatch. No other workflow SHALL publish.

Every record of a stable release — its tag, GitHub Release, and `master` — SHALL be
written only after the registry serves the verified package. A release tag SHALL NOT
be deleted or moved. An existing development version MAY be a manual no-op or a
nightly exact-registry verification; an existing stable version SHALL be refused.

#### Scenario: Work lands on develop
- **WHEN** a commit declaring a prerelease version is pushed to `develop`
- **THEN** no publication SHALL start solely from that push, and the next nightly or explicit development request MAY select it only while it remains authoritative

#### Scenario: A release tag is pushed
- **WHEN** a commit declaring a stable version is pushed to `develop`
- **THEN** no publication SHALL start solely from the push or a tag, and explicit stable publication SHALL write its tag and GitHub Release only after npm verification

#### Scenario: A tag disagrees with its commit
- **WHEN** a release fails at any point before the registry serves the package
- **THEN** no tag, GitHub Release, or moved branch SHALL exist for that version

#### Scenario: A version is already published
- **WHEN** the resolved version already exists on the registry
- **THEN** manual development MAY finish before package work, nightly SHALL verify the immutable registry bytes, and stable publication SHALL fail without republishing

### Requirement: Preview versions cost no commits
A preview version SHALL be derived at publish time from the open base version and the
unique merged pull-request number associated with the exact selected `develop`
commit. It SHALL NOT be committed. Between releases the repository SHALL declare one
open prerelease version. Merging commits SHALL NOT itself promise or trigger one
preview per commit.

A commit declaring a stable version SHALL be eligible only for explicit stable
publication, so preview automation never interprets it as a development candidate.

#### Scenario: Several commits land in a row
- **WHEN** three commits are pushed to `develop`
- **THEN** no publication SHALL start from the pushes alone, and a later development request SHALL derive one preview from the then-authoritative source's merged pull request without a version commit

#### Scenario: A release is prepared but not yet tagged
- **WHEN** `develop` declares a stable version
- **THEN** development publication SHALL refuse it and only explicit stable publication MAY publish it to `latest`

### Requirement: A stable release is not visible until npm has it
No tag, GitHub Release, or release-naming branch update SHALL exist for a version
the registry does not serve. The publication SHALL write them in that order after
the registry has accepted and been verified to serve the exact published bytes.

#### Scenario: npm rejects the upload
- **WHEN** publication fails
- **THEN** nothing SHALL be visible for that version anywhere, and the run SHALL fail

#### Scenario: npm accepts the upload
- **WHEN** the registry serves the published version
- **THEN** the tag, the GitHub Release, and the release-naming branch SHALL be written

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
Repository automation SHALL arrange automatic squash integration only when every changed and renamed-from path is under `openspec/**`, under `docs/**`, or is exactly the root `README.md`. It MAY arm an eligible pull request while required validation is pending because protected `develop` remains the merge gate. If validation finishes before automation can arm the pull request and GitHub already reports it clean, automation MAY merge only when the successful validation belongs to the current head and the merge request enforces that expected head SHA.

An eligible pull request SHALL pass documentation-sensitive governance and, when OpenSpec is touched, strict OpenSpec validation. A pull request containing any other path SHALL remain open for local maintainer validation and manual merge, including behavior-preserving refactors and mixed documentation-plus-code changes. CI success SHALL NOT substitute for local maintainer acceptance of code. Failed validation or successful validation for an older head SHALL NOT authorize direct integration.

#### Scenario: Complete diff is auto-merge eligible
- **WHEN** every changed and renamed-from path is under `openspec/**`, under `docs/**`, or is the root `README.md`
- **THEN** automation SHALL arrange squash integration behind the required validation gate

#### Scenario: Maintained docs change is validated
- **WHEN** an eligible pull request changes a path under `docs/**`
- **THEN** CI SHALL run documentation-sensitive governance before the required validation gate succeeds

#### Scenario: OpenSpec change is validated
- **WHEN** an eligible pull request changes a path under `openspec/**`
- **THEN** CI SHALL run strict OpenSpec validation before the required validation gate succeeds

#### Scenario: Eligible pull request is still validating
- **WHEN** an eligible current head is blocked only because required validation is pending
- **THEN** automation MAY arm squash auto-merge and SHALL rely on protected `develop` to prevent premature integration

#### Scenario: Eligible pull request is already clean
- **WHEN** successful required validation belongs to the current head and GitHub already reports that head clean
- **THEN** automation MAY squash-merge using that exact head SHA

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

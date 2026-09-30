## MODIFIED Requirements

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
to the current authoritative `origin/develop` commit. It SHALL then start, or reuse a
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

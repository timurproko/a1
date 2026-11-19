## MODIFIED Requirements

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
source and stable version, report the draft and validation URLs, and exit without
waiting.

Candidate validation SHALL stamp the stable version on the bound source, pack both
packages with the draft's then-current note over committed history, and run the
complete stable suite on the exact bytes without publishing npm, uploading a Release
asset, or moving `master`.

On `release.published` for a stable, non-prerelease Release, trusted code SHALL
derive the version from the tag and SHALL require the tag to be a lightweight tag at
the Release's bound source, that source to be in `develop` history, the publishing
actor to be a GitHub `User` with `write`, `maintain`, or `admin` permission, both
target package versions to be absent, and a successful candidate validation of that
exact source and version. It SHALL snapshot the bounded normalized published body,
repack both packages with it, rerun the exact-package gates on the final bytes,
require the Release to remain published with the snapshotted body immediately before
npm, publish both packages to npm `latest` with provenance, verify and exercise the
published pair, upload the validated asset, fast-forward `master`, and prepare
reopening. Apps, bots, pushed tags, and dispatch payloads SHALL grant no npm
authority. Existing release tags SHALL never be moved or reused.

#### Scenario: Work lands on develop
- **WHEN** a commit declaring a prerelease version is pushed to `develop`
- **THEN** no publication SHALL start solely from that push, and a later trusted request MAY select it only while it remains authoritative

#### Scenario: Prepare a stable draft
- **WHEN** the maintainer selects stable `0.1.8` from authoritative `develop` declaring `0.1.8-dev`
- **THEN** preparation SHALL create or reuse an unpublished source-bound draft, start candidate validation of that source as `0.1.8`, print the draft editing URL exactly once and the validation URL, and exit without package publication, tag, public Release, pull request, or `master` movement
- **AND** it SHALL NOT wait for a draft save or ask the maintainer to enter `0.1.8` again

#### Scenario: Generate a Pi-style changelog draft
- **WHEN** preparation creates a new draft for stable `0.1.8`
- **THEN** its body SHALL begin with `## [0.1.8] - YYYY-MM-DD` and group applicable entries under level-three Breaking Changes, New Features, Added, Changed, and Fixed headings
- **AND** a retained version/date heading SHALL identify the expected version and a valid calendar date while the body remains human-editable

#### Scenario: Preparation repeats while validation runs
- **WHEN** the command runs again for the same source and version while a candidate validation is running or has succeeded
- **THEN** it SHALL reuse that validation and the existing draft without overwriting the draft body

#### Scenario: A stable version is requested
- **WHEN** an authorized human chooses **Publish release** on the prepared draft after its candidate validation succeeded
- **THEN** GitHub SHALL create the tag at the bound source and trusted code SHALL publish both exact packages to npm `latest`, upload the asset, fast-forward `master`, and prepare the reopening pull request without another version entry

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
- **WHEN** candidate-run gating, packaging, exact-package validation, or cancellation stops publication before either npm upload starts
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

## REMOVED Requirements

### Requirement: A stable release is not visible until npm has it
**Reason**: Native **Publish release** is now the stable npm trigger, so the public Release and tag necessarily precede npm by the few minutes publication takes.
**Migration**: Replaced by "A failed stable publication returns to draft before npm", which bounds that window: a failure before npm returns the Release to draft and deletes the unconsumed tag, and a failure after npm keeps both and reruns the same run.

## ADDED Requirements

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

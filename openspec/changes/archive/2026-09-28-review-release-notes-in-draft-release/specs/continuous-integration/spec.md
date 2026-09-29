## MODIFIED Requirements

### Requirement: Publication follows from what was pushed
Publication SHALL use one workflow whose source is the exact current `origin/develop`
commit. It SHALL start nightly or by explicit dispatch; a push, pull-request merge,
tag, draft Release creation, or draft edit alone SHALL NOT publish. A manual request
SHALL provide the intended channel and exact source SHA and SHALL fail if that SHA is
no longer authoritative `develop`.

Nightly and explicit development publication SHALL derive one immutable preview
version from the unique merged pull request associated with the selected source and
publish or verify npm `next`. Stable preparation SHALL require an explicit final
`x.y.z` version that is not below the source's open development version and SHALL
create or safely reuse an unpublished draft GitHub Release bound to that exact source.
Stable publication SHALL additionally require a distinct explicit approval dispatch
from an authorized human GitHub user naming the draft Release identity and exact
normalized body digest. The trusted workflow SHALL independently re-read and verify
the draft, actor, source, target, state, and digest before snapshotting its body. No
channel SHALL accept a source that does not declare exactly one open `x.y.z-dev`
version. No other workflow SHALL publish.

Every record of a stable release — its tag, published GitHub Release, and `master` —
SHALL be written only after the registry serves the verified packages and SHALL name
the open development commit from which those packages were built. The exact approved
snapshot SHALL supply the stable package resource and final GitHub Release body. A
release tag SHALL NOT be deleted or moved. An existing development version MAY be a
manual no-op or a nightly exact-registry verification; an existing stable version
SHALL be refused.

#### Scenario: Work lands on develop
- **WHEN** a commit declaring a prerelease version is pushed to `develop`
- **THEN** no publication SHALL start solely from that push, and the next nightly or explicit development request MAY select it only while it remains authoritative

#### Scenario: Prepare a stable draft
- **WHEN** the maintainer selects stable `0.1.8` from current authoritative `develop` declaring `0.1.8-dev`
- **THEN** the command SHALL create or reuse an unpublished draft GitHub Release bound to that source and target, print its editing URL, and stop without a release-note pull request, package publication, tag, public Release, or `master` movement

#### Scenario: A release-review PR is manually merged
- **WHEN** a release-note pull request is manually or automatically merged under the retired protocol
- **THEN** that merge SHALL grant no publication authority because stable review now belongs to an explicitly approved draft GitHub Release

#### Scenario: A stable version is requested
- **WHEN** an authorized human explicitly approves the valid current draft for `0.1.8` and its exact source/body digest
- **THEN** the workflow SHALL snapshot that body, stamp `0.1.8` on the selected source, package the snapshot, validate the exact bytes, publish to `latest`, and write `v0.1.8`, the reviewed GitHub Release, and `master` at that source only after npm verification

#### Scenario: A draft exists without approval
- **WHEN** the draft Release is created, edited, or passes any unrelated validation without the explicit authorized approval dispatch
- **THEN** stable publication SHALL remain forbidden

#### Scenario: A stable request lacks reviewed notes
- **WHEN** stable approval names a missing, published, stale, ambiguous, unsafe, mismatched, or differently digested draft Release, or its actor is an App, bot, or unauthorized user
- **THEN** the workflow SHALL fail before building or publishing anything

#### Scenario: Develop advances after draft preparation
- **WHEN** authoritative `develop` no longer equals the source bound to the edited draft
- **THEN** approval SHALL fail and SHALL NOT silently retarget, overwrite, or publish the draft for the newer source

#### Scenario: A stable request names an unacceptable version
- **WHEN** a stable request omits the version, names a prerelease, or names a version below the open development version's core
- **THEN** it SHALL fail before building anything

#### Scenario: A source declares a stable version
- **WHEN** the selected `develop` commit declares `0.1.8` rather than `0.1.8-dev`
- **THEN** every channel SHALL refuse it and the maintainer command SHALL refuse before release mutation

#### Scenario: A release tag is pushed
- **WHEN** a `v*` tag or any commit is pushed by hand
- **THEN** no publication SHALL start solely from the push or tag, and explicit stable publication SHALL write its own tag and publish its reviewed draft only after npm verification

#### Scenario: A tag disagrees with its commit
- **WHEN** a tag already exists away from the exact approved source or a failed attempt leaves contradictory release identity
- **THEN** stable publication SHALL refuse to move or reinterpret that tag

#### Scenario: A draft is published through GitHub prematurely
- **WHEN** an operator uses GitHub's native Publish release action before exact package verification
- **THEN** stable publication SHALL reject the non-draft record and SHALL NOT treat its tag or body as approved evidence

#### Scenario: A version is already published
- **WHEN** the resolved stable version already exists on the registry
- **THEN** stable publication SHALL fail without republishing, while manual development MAY remain a no-op and nightly SHALL retain exact-registry verification

### Requirement: Preview versions cost no commits
A preview version SHALL be derived at publish time from the open base version and the
unique merged pull-request number associated with the exact selected `develop`
commit. A stable version SHALL be named by its explicit approval dispatch and stamped
at publish time on the same kind of open source. Neither version SHALL be committed.
Between releases the repository SHALL declare one open prerelease version. A stable
release SHALL add no pre-publication note or stable-version commit. After the stable
packages are verified, one manually merged reopening commit SHALL both persist the
exact approved release note and declare the next prerelease; it SHALL NOT declare the
stable package version. Merging ordinary commits SHALL NOT itself promise or trigger
one preview per commit.

#### Scenario: Several commits land in a row
- **WHEN** three commits are pushed to `develop`
- **THEN** no publication SHALL start from the pushes alone, and a later development request SHALL derive one preview from the then-authoritative source's merged pull request without a version commit

#### Scenario: A release is prepared for review
- **WHEN** `develop` declares `0.1.8-dev` and stable `0.1.8` is selected
- **THEN** release preparation SHALL create the reviewable draft Release without committing either `0.1.8` or its note to `develop`

#### Scenario: A release is prepared but not yet tagged
- **WHEN** `develop` declares a stable version, a state release automation does not produce
- **THEN** development and stable publication SHALL both refuse it until a manually reviewed pull request restores an open prerelease

#### Scenario: A release reopens development
- **WHEN** stable `0.1.8` is verified on the registry from approved source declaring `0.1.8-dev`
- **THEN** the maintainer command SHALL prepare one pull request that declares `0.1.9-dev` and adds the exact approved `docs/releases/0.1.8.md`, and SHALL report development reopened only after a human merges it

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

### Requirement: Release version pull requests require manual integration
The post-publication next-development pull request SHALL remain subject to required
validation, local maintainer acceptance, and manual merge. The release command SHALL
NOT create a pre-publication release-note or stable-version pull request, enable
auto-merge, directly merge the reopening PR, relax branch protection, or treat CI
success alone as permission to advance. It SHALL display the draft Release and
reopening PR URLs with phase-specific manual steps and verify the reopening PR's
actual merge before reporting completion.

Reopening preparation SHALL preserve the caller's checkout, staged/unstaged work,
and unrelated worktrees. Version edits SHALL affect only this package's manifest and
root lockfile version fields, not dependency versions, and the only additional file
SHALL be the exact approved `docs/releases/<released-version>.md`. Pending or failed
work SHALL remain identifiable without destructive resets or silent replacement of a
conflicting draft, branch, or PR.

#### Scenario: Prepare the stable version PR
- **WHEN** the command prepares stable `0.1.8` from `0.1.8-dev`
- **THEN** it SHALL present the draft GitHub Release for editing and SHALL create no stable-version or release-note pull request

#### Scenario: Prepare the reopening PR
- **WHEN** stable `0.1.8` is published successfully
- **THEN** the command SHALL present one PR containing `0.1.9-dev` version changes and the exact approved `docs/releases/0.1.8.md` for manual validation and merge

#### Scenario: A version PR is not merged
- **WHEN** the reopening PR is closed without merging, cannot be verified, or remains pending beyond the bounded wait
- **THEN** the command SHALL report its identity and incomplete state without merging automatically or claiming that development reopened

#### Scenario: Local work appears while a release waits
- **WHEN** the caller's checkout changes while release orchestration is awaiting publication or the reopening PR
- **THEN** those changes SHALL be preserved and any unsafe local synchronization SHALL be declined with authoritative remote state reported

### Requirement: Development reopens only after verified stable publication
The command SHALL prepare the next patch development version only after successful
publication of the selected stable version is confirmed through the existing
exact-source publication authority. It SHALL verify that the published source,
approved note digest, tag, GitHub Release body, and registry package correspond to the
same release before preparing reopening, and SHALL fail rather than silently
substitute a newer source SHA or regenerated note.

For released `x.y.z`, the reopening target SHALL be `x.y.(z+1)-dev`. Reopening SHALL
be reported complete only after its separate PR containing the next version and exact
approved note is manually merged and remote content is verified. Failed or uncertain
publication SHALL not trigger reopening. Successful publication followed by
incomplete reopening SHALL be reported as two distinct outcomes without republishing
or altering immutable release records.

#### Scenario: Finish the current release cycle
- **WHEN** exact-source publication of stable `0.1.8` and its approved snapshot is confirmed successful
- **THEN** the command SHALL prepare a separate PR for `0.1.9-dev` plus `docs/releases/0.1.8.md`
- **AND** it SHALL report development reopened only after that PR is manually merged and verified

#### Scenario: Publication fails or remains uncertain
- **WHEN** stable publication fails, times out, or cannot be confirmed
- **THEN** no next-development PR SHALL be created by that attempt and the command SHALL provide inspection guidance without claiming release success

#### Scenario: The publication source becomes stale
- **WHEN** authoritative develop no longer matches the source bound to the approved draft before dispatch
- **THEN** the command SHALL stop with the mismatch and SHALL not publish a newly selected SHA without a fresh deliberate preparation and approval

#### Scenario: Reopening is incomplete after publication
- **WHEN** `0.1.8` is confirmed published but the `0.1.9-dev` and note PR fails or is not merged
- **THEN** the command SHALL distinguish published `0.1.8` from pending development reopening and SHALL not republish, move its tag, or falsely report develop at `0.1.9-dev`

### Requirement: Maintainer release documentation matches the command
The root README release section SHALL present concise, accurate `npm run release --
patch`, `minor`, `major`, and exact-version preparation examples and SHALL NOT be
required to duplicate internal publication lifecycle or recovery prose. The release
runbook and applicable command help SHALL explain the target-required rule,
prerelease promotion, draft Release editing, explicit `--approve` operation,
publication-before-reopening order, next-development version, manual reopening-PR
gate, and safe recovery. They SHALL NOT advertise a no-argument release mode, the
native GitHub Publish action, a pre-publication notes PR, or self-merging reopening.

A dependency-free semantic governance check SHALL validate the applicable contract
whenever the root README or release runbook changes, including documentation-only
pull requests eligible for automatic integration. It SHALL reject malformed or
resolver-inaccurate command examples and missing operator safety gates before stable
publication. Unrelated documentation changes SHALL not gain product builds or broad
product tests solely for this contract.

#### Scenario: Follow the README example
- **WHEN** a maintainer reads the root release section
- **THEN** `patch`, `minor`, `major`, and exact-version examples SHALL resolve to the documented stable targets and explain that preparation alone does not publish

#### Scenario: Read recovery guidance
- **WHEN** a maintainer needs preparation, approval, publication, reopening, or recovery behavior
- **THEN** the runbook SHALL distinguish draft editing from explicit approval, forbid native early publication, and state that reopening follows confirmed publication and requires manual merge

#### Scenario: Documentation-only release commands drift
- **WHEN** a documentation-only pull request changes root release examples or the release runbook
- **THEN** lightweight semantic governance SHALL validate the changed contract before automatic integration and inaccurate examples or missing safety gates SHALL fail without broad product tests

### Requirement: Stable release notes are generated, editable, and manually accepted before publication
The release command SHALL resolve the previous verified stable release as an ancestor
of current authoritative `origin/develop`, enumerate uniquely associated merged pull
requests in that range, and deterministically generate one bounded user-facing body
for the selected stable target. It SHALL render escaped linked pull-request titles in
stable order under feature, fix, other-change, and breaking-change groups as
applicable while excluding release housekeeping. Version identity SHALL come from the
source-bound draft Release and target metadata rather than a redundant heading in the
body. Missing, ambiguous, stale, or non-ancestral evidence SHALL stop before draft or
publication mutation.

The command SHALL create or safely reuse one unpublished draft GitHub Release bound
to the exact repository, target version, and authoritative source. A maintainer may
edit its body directly in the Releases UI. Preparation SHALL preserve edits and grant
no authority. A distinct explicit approval SHALL require an authorized human GitHub
user and SHALL bind the draft database identity, source, version, normalized body,
and digest. Trusted publication SHALL independently verify and snapshot those values;
subsequent mutable draft edits SHALL not change the approved package candidate or
final Release body.

Committed `docs/releases/*.md` files SHALL represent completed release history. The
stable package SHALL combine prior committed history with the current approved
snapshot. After successful publication, the manually merged reopening PR SHALL add
the snapshot at `docs/releases/<target>.md` with the next-development version. The
native GitHub Publish action, draft creation, CI success, automatic integration, or a
body-only edit SHALL NOT authorize publication.

#### Scenario: Prepare a stable release
- **WHEN** the maintainer selects stable `0.1.8` from current reviewed history after the previous stable ancestor
- **THEN** the command SHALL open an editable source-bound draft GitHub Release and SHALL stop at the explicit approval gate without creating a notes PR

#### Scenario: Edit generated wording
- **WHEN** the maintainer changes headings or prose in the valid draft body before approval
- **THEN** explicit approval SHALL validate and snapshot the edited Markdown for both package and final GitHub Release content

#### Scenario: CI succeeds without manual merge
- **WHEN** the draft exists and is valid but no authorized human approval dispatch identifies its exact body digest
- **THEN** stable publication SHALL remain forbidden and no package, tag, public Release, or `master` movement SHALL occur

#### Scenario: The candidate changes outside release-note paths
- **WHEN** the draft points at another source or target, is already published, is ambiguous, exceeds bounds, contains unsafe content, or differs from the approved digest
- **THEN** the command or trusted workflow SHALL reject it without overwriting maintainer text or dispatching package work

#### Scenario: Develop advances after review
- **WHEN** another change becomes authoritative `develop` before approval dispatch
- **THEN** the command SHALL refuse to publish the newer source under the prior draft and SHALL require explicit preparation of a source-bound replacement

#### Scenario: Publication succeeds
- **WHEN** the exact approved source and snapshot complete stable publication
- **THEN** the package and published GitHub Release SHALL contain the same approved body, and the reopening PR SHALL persist that body with the next-development version

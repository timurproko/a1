## MODIFIED Requirements

### Requirement: Publication follows from what was pushed
Publication SHALL use trusted workflows whose source is the exact current
`origin/develop` commit. It SHALL start nightly, by explicit development dispatch,
or by an explicit stable approval dispatch from the **Approve stable release** GitHub
Actions workflow; a push, pull-request merge, tag, draft Release creation, draft edit,
or native GitHub Release publication alone SHALL NOT publish npm packages. A manual
development request SHALL provide its intended channel and exact source SHA and SHALL
fail if that SHA is no longer authoritative `develop`. A manual stable approval SHALL
ask the operator only for an exact final version; trusted workflow code SHALL derive
and bind the authoritative source, Release database identity, state, normalized body,
and digest.

Nightly and explicit development publication SHALL derive one immutable preview
version from the unique merged pull request associated with the selected source and
publish or verify npm `next`. Stable preparation SHALL require an explicit final
`x.y.z` version that is not below the source's open development version and SHALL
create or safely reuse an unpublished draft GitHub Release bound to that exact source.
Stable publication SHALL additionally require a distinct explicit approval dispatch
from an authorized human GitHub user. The trusted workflow SHALL independently read
and verify the Release, actor, source, target, state, bounded normalized body, and
digest before snapshotting its body. No channel SHALL accept a source that does not
declare exactly one open `x.y.z-dev` version. No other workflow SHALL publish.

Every normal record of a stable release — its tag, published GitHub Release, and
`master` — SHALL be written only after the registry serves the verified packages and
SHALL name the open development commit from which those packages were built. The exact
approved snapshot SHALL supply the stable package resource, final GitHub Release body,
and durable reopening note. A release tag SHALL NOT be deleted or moved. An existing
development version MAY be a manual no-op or a nightly exact-registry verification;
an existing stable package version SHALL be refused. An exact orphan tag left by a
prematurely published and then deleted Release, with no stable package pair, MAY enter
only the explicit recovery scenario defined below; native publication and the orphan
tag themselves grant no package authority.

#### Scenario: Work lands on develop
- **WHEN** a commit declaring a prerelease version is pushed to `develop`
- **THEN** no publication SHALL start solely from that push, and the next nightly or explicit development request MAY select it only while it remains authoritative

#### Scenario: Prepare a stable draft
- **WHEN** the maintainer selects stable `0.1.8` from current authoritative `develop` declaring `0.1.8-dev`
- **THEN** the command SHALL create or reuse an unpublished draft GitHub Release bound to that source and target, print its editing URL exactly once, print the stable approval Actions URL exactly once, and stop without a release-note pull request, package publication, tag, public Release, or `master` movement

#### Scenario: A stable version is requested
- **WHEN** an authorized human runs **Approve stable release** for `0.1.8` while the exact source-bound draft remains valid
- **THEN** trusted workflow code SHALL derive its database identity and normalized body digest, snapshot that body, stamp `0.1.8` on the selected source, validate exact packages, and publish to npm `latest`
- **AND** the same GitHub Release SHALL remain a draft until every required package, published-pair, tag, asset, and `master` completion gate succeeds
- **AND** successful completion SHALL publish that draft with the exact approved body as the final mutation

#### Scenario: Approved publication fails
- **WHEN** any required stable package, validation, registry, published-pair, tag, asset, or `master` step fails before final Release publication
- **THEN** the GitHub Release SHALL remain a draft and SHALL retain the approved identity for inspection or an explicitly revalidated retry
- **AND** failed or uncertain package state SHALL not be represented as a completed stable Release

#### Scenario: A draft exists without approval
- **WHEN** the draft Release is created, edited, passes unrelated validation, or is viewed through its editing URL without the explicit authorized Actions dispatch
- **THEN** stable publication SHALL remain forbidden

#### Scenario: A release-review PR is manually merged
- **WHEN** a release-note pull request is manually or automatically merged under the retired protocol
- **THEN** that merge SHALL grant no publication authority because stable review belongs to an explicitly approved GitHub Release snapshot

#### Scenario: A draft is published through GitHub prematurely
- **WHEN** an operator uses GitHub's native **Publish release** action
- **THEN** that event SHALL NOT dispatch npm publication or count as stable approval
- **AND** any resulting partial public record SHALL require the separate authorized recovery approval before package work can begin

#### Scenario: A stable request lacks reviewed notes
- **WHEN** stable approval names a missing, stale, ambiguous, unsafe, mismatched, or differently digested Release, or its actor is an App, bot, or unauthorized user
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
- **THEN** no publication SHALL start solely from the push or tag, and normal stable publication SHALL write its own tag only after npm verification

#### Scenario: A tag disagrees with its commit
- **WHEN** a tag exists away from the exact approved source or a failed attempt leaves contradictory release identity
- **THEN** stable publication and recovery SHALL refuse to move, delete, or reinterpret that tag

#### Scenario: A version is already published
- **WHEN** the resolved stable version already exists on the registry
- **THEN** stable publication SHALL fail without republishing, while manual development MAY remain a no-op and nightly SHALL retain exact-registry verification

### Requirement: Preview versions cost no commits
A preview version SHALL be derived at publish time from the open base version and the
unique merged pull-request number associated with the exact selected `develop`
commit. A stable version SHALL be named by its explicit Actions approval dispatch and
stamped at publish time on the same kind of open source. Neither version SHALL be
committed. Between releases the repository SHALL declare one open prerelease version.
A stable release SHALL add no pre-publication note or stable-version commit. After the
stable packages are verified, trusted automation SHALL create one reopening pull
request whose single commit persists the exact approved release note and declares the
next prerelease; it SHALL NOT declare the stable package version, enable auto-merge,
or merge the pull request. Merging ordinary commits SHALL NOT itself promise or
trigger one preview per commit.

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
- **THEN** trusted automation SHALL prepare one pull request that declares `0.1.9-dev` and adds the exact approved `docs/releases/0.1.8.md`
- **AND** development SHALL be reported reopened only after an authorized human manually merges that pull request

#### Scenario: Develop advances during publication
- **WHEN** unrelated work advances `develop` after the stable source was approved but before reopening is prepared
- **THEN** the reopening commit SHALL use the then-current authoritative `develop` tip only if it still declares the expected open version and does not already contain the released note
- **AND** it SHALL never rewrite or discard the unrelated work

### Requirement: A stable release is not visible until npm has it
For a normal stable publication, no tag, public GitHub Release, or release-naming
branch update SHALL exist for a version the registry does not serve. Publication SHALL
write them only after the registry has accepted and been verified to serve the exact
published bytes. GitHub's native publication action is outside this protocol and SHALL
never start npm work by itself.

Registry verification SHALL allow for npm's asynchronous ingestion of an accepted
upload: it SHALL poll the package metadata for at least ten minutes, within the
publishing job's timeout, before declaring that the version has not propagated, and
SHALL report each unsuccessful attempt with its reason. Bytes that differ from the
validated package or a channel tag that names another version SHALL still fail the
verification immediately, whatever the remaining window.

Recovery preparation MAY handle one orphan stable tag only when trusted code proves
that the immutable tag names the exact current open-development source, no GitHub
Release exists for it, neither npm package version exists, npm `latest`, `master`, and
a prior complete stable tag agree on one ancestor baseline, and no contradictory
record claims completion. It SHALL generate notes from that complete baseline rather
than from the orphan tag and SHALL create a new unpublished draft referring to the
existing tag/source without moving or recreating the tag.

Recovery approval SHALL require an authorized human's Actions dispatch after that
fresh draft has been reviewed and saved. It SHALL snapshot the bounded draft body,
publish and verify the exact package pair, preserve the existing tag, attach only the
validated artifact, advance `master`, publish that draft only after all completion
gates succeed, and create the ordinary manually merged reopening PR. It SHALL NOT
infer the deleted Release body, delete or move the tag, or claim that the replacement
Release retains the deleted database identity.

#### Scenario: npm rejects the upload
- **WHEN** normal stable publication fails before registry verification
- **THEN** no stable tag, public Release, or `master` movement SHALL be written, and the run SHALL fail

#### Scenario: npm accepts the upload
- **WHEN** the registry serves the published version
- **THEN** the tag, public GitHub Release, and `master` SHALL be written from the approved source and snapshot

#### Scenario: npm is still processing the upload
- **WHEN** `npm publish` has returned but the registry does not yet list the version
- **THEN** verification SHALL keep polling for at least ten minutes, logging each attempt, and SHALL succeed once the registry serves the exact validated bytes under the requested channel tag

#### Scenario: The registry never serves the version within the window
- **WHEN** ten minutes pass without the registry listing the version
- **THEN** the publication SHALL fail, no new stable record SHALL be written, and a rerun of the failed jobs SHALL verify the earlier upload without publishing a second time

#### Scenario: Orphan tag receives a replacement draft
- **WHEN** stable preparation selects an exact orphan tag satisfying every recovery precondition
- **THEN** it SHALL generate the draft from the prior complete stable baseline, create one unpublished replacement Release for the existing tag/source, and require fresh human review
- **AND** it SHALL NOT move, delete, recreate, or use the orphan tag itself as changelog approval

#### Scenario: Exact orphan tag is explicitly recovered
- **WHEN** an authorized human runs **Approve stable release** after reviewing the replacement draft while both npm packages remain absent
- **THEN** the workflow SHALL snapshot its body as the approval authority and complete the missing exact packages and records without moving or deleting the existing tag
- **AND** any failure before final Release publication SHALL leave the replacement Release as a draft

#### Scenario: Premature record recovery is ambiguous
- **WHEN** the approved replacement draft is missing, the tag or source differs, either package exists unexpectedly, the prior complete baseline disagrees across npm, `master`, and Git, the body is unsafe, completion records contradict recovery, or the source is no longer authoritative
- **THEN** recovery SHALL fail before package construction and SHALL preserve all existing records for inspection

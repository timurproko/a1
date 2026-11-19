## MODIFIED Requirements

### Requirement: Publication follows from what was pushed
Publication SHALL use one workflow whose source is the exact current `origin/develop`
commit. It SHALL start nightly or by explicit dispatch; a push, pull-request merge,
or tag alone SHALL NOT publish. A manual request SHALL provide the intended channel
and exact source SHA and SHALL fail if that SHA is no longer authoritative `develop`.

Nightly and explicit development publication SHALL derive one immutable preview
version from the unique merged pull request associated with the selected source and
publish or verify npm `next`. Stable publication SHALL require explicit stable
dispatch naming a final `x.y.z` version that is not below the open development
version the source declares. Its exact source SHALL contain the matching reviewed
release-note document from an authorized manually merged release-review PR, and the
workflow SHALL stamp the stable version on that source before packing. No channel
SHALL accept a source that does not declare exactly one open `x.y.z-dev` version. No
other workflow SHALL publish.

Every record of a stable release — its tag, GitHub Release, and `master` — SHALL be
written only after the registry serves the verified package, and SHALL name the open
development commit the package was built from. The GitHub Release SHALL present the
same reviewed Markdown packaged for that stable version rather than generic or
regenerated notes. A release tag SHALL NOT be deleted or moved. An existing
development version MAY be a manual no-op or a nightly exact-registry verification;
an existing stable version SHALL be refused.

#### Scenario: Work lands on develop
- **WHEN** a commit declaring a prerelease version is pushed to `develop`
- **THEN** no publication SHALL start solely from that push, and the next nightly or explicit development request MAY select it only while it remains authoritative

#### Scenario: A release-review PR is manually merged
- **WHEN** an authorized human manually merges a valid release-review PR into `develop`
- **THEN** no publication SHALL start from the merge event itself, and the waiting maintainer command MAY explicitly dispatch that exact merge only while it remains authoritative

#### Scenario: A stable version is requested
- **WHEN** the maintainer command dispatches the stable channel for the current reviewed `develop` commit declaring `0.1.8-dev`, carrying `docs/releases/0.1.8.md`, and naming version `0.1.8`
- **THEN** the workflow SHALL stamp `0.1.8` on that source, pack the reviewed note with the exact candidate, validate the bytes, publish to `latest`, and write `v0.1.8`, the reviewed GitHub Release, and `master` at that same commit only after npm verification

#### Scenario: A stable request lacks reviewed notes
- **WHEN** a stable dispatch names a source without the matching valid reviewed note and verified manually merged release-review provenance
- **THEN** the workflow SHALL fail before building or publishing anything

#### Scenario: A stable request names an unacceptable version
- **WHEN** a stable dispatch omits the version, names a prerelease, or names a version below the open development version's core
- **THEN** the workflow SHALL fail before building anything

#### Scenario: A source declares a stable version
- **WHEN** the selected `develop` commit declares `0.1.8` rather than `0.1.8-dev`
- **THEN** every channel SHALL refuse it and the maintainer command SHALL refuse before any Git operation

#### Scenario: A release tag is pushed
- **WHEN** a `v*` tag or any commit is pushed by hand
- **THEN** no publication SHALL start solely from the push or the tag, and explicit stable publication SHALL write its own tag and GitHub Release only after npm verification

#### Scenario: A tag disagrees with its commit
- **WHEN** a release fails at any point before the registry serves the package
- **THEN** no tag, GitHub Release, or moved branch SHALL exist for that version

#### Scenario: A version is already published
- **WHEN** the resolved version already exists on the registry
- **THEN** manual development MAY finish before package work, nightly SHALL verify the immutable registry bytes, and stable publication SHALL fail without republishing

### Requirement: Preview versions cost no commits
A preview version SHALL be derived at publish time from the open base version and the
unique merged pull-request number associated with the exact selected `develop`
commit. A stable version SHALL be named by its explicit dispatch and stamped at
publish time on the same kind of open source. Neither version SHALL be committed.
Between releases the repository SHALL declare one open prerelease version. A stable
release SHALL add one reviewed release-note commit before publication and one
version-only commit that reopens the next prerelease after the stable package is
verified on the registry; it SHALL NOT add a commit that declares the stable package
version. Merging ordinary commits SHALL NOT itself promise or trigger one preview per
commit.

#### Scenario: Several commits land in a row
- **WHEN** three commits are pushed to `develop`
- **THEN** no publication SHALL start from the pushes alone, and a later development request SHALL derive one preview from the then-authoritative source's merged pull request without a version commit

#### Scenario: A release is prepared for review
- **WHEN** `develop` declares `0.1.8-dev` and stable `0.1.8` is selected
- **THEN** release preparation SHALL add the reviewable `0.1.8` note without committing `0.1.8` as the package version

#### Scenario: A release is prepared but not yet tagged
- **WHEN** `develop` declares a stable version, a state release automation does not produce
- **THEN** development and stable publication SHALL both refuse it until a version-only pull request restores an open prerelease

#### Scenario: A release reopens development
- **WHEN** stable `0.1.8` is verified on the registry from a reviewed `develop` source declaring `0.1.8-dev`
- **THEN** the maintainer command SHALL prepare one version-only pull request declaring `0.1.9-dev` from the then-current `develop`, which SHALL still declare `0.1.8-dev`, and SHALL report development reopened only after a human merges it

## ADDED Requirements

### Requirement: Stable release notes are generated, editable, and manually accepted before publication
The release command SHALL resolve the previous verified stable release as an ancestor
of current authoritative `origin/develop`, enumerate the uniquely associated merged
pull requests in that range, and deterministically generate one user-facing draft at
`docs/releases/<target>.md`. The draft SHALL identify the exact stable target and
SHALL render escaped linked pull-request titles in stable order under user-facing
feature, fix, other-change, and breaking-change groups as applicable. Release
housekeeping SHALL not be presented as a product change. Missing, ambiguous, stale,
or non-ancestral evidence SHALL stop before branch, pull-request, or publication
mutation.

The command SHALL publish that draft in one same-repository release-review pull
request targeting `develop`. The note SHALL be ordinary committed Markdown that a
maintainer may revise before merge. While waiting, the command SHALL follow the live
PR head and SHALL continuously require the expected repository, base, release
identity, allowed changed paths, valid note, absence of auto-merge, and an open or
verified merged state. PR creation and CI success SHALL grant no publication
authority. Only an authorized human's manual merge of the valid candidate SHALL
permit the explicit stable dispatch, and the exact merge SHALL still be current
`origin/develop`. A changed source SHALL require a fresh review candidate rather than
silently publishing additional work.

#### Scenario: Prepare a stable release
- **WHEN** the maintainer selects stable `0.1.8` from current reviewed history after the previous stable ancestor
- **THEN** the command SHALL open a release-review PR containing generated `docs/releases/0.1.8.md` and SHALL stop publication at the manual-review gate

#### Scenario: Edit generated wording
- **WHEN** the maintainer changes headings or prose in the committed target note while the PR retains its valid identity and allowed diff
- **THEN** the command SHALL revalidate the live head and SHALL use the merged edited Markdown as the package and GitHub Release content

#### Scenario: CI succeeds without manual merge
- **WHEN** the release-review PR is green but remains open, is auto-merged, or is closed without an authorized human manual merge
- **THEN** stable publication SHALL remain forbidden and the command SHALL report the incomplete or invalid gate

#### Scenario: The candidate changes outside release-note paths
- **WHEN** the release-review PR adds an unsupported file, changes its target identity, points at another base, comes from a fork, or arms auto-merge
- **THEN** the command SHALL reject it without overwriting the branch or dispatching publication

#### Scenario: Develop advances after review
- **WHEN** another change becomes authoritative `develop` before the reviewed merge can be dispatched
- **THEN** the command SHALL refuse to publish the newer source under the prior review and SHALL require a fresh candidate that covers the new range

#### Scenario: Publication succeeds
- **WHEN** the manually reviewed merge is still authoritative and exact stable publication succeeds
- **THEN** the package and GitHub Release SHALL contain its reviewed target note, and the command SHALL proceed to the separate manually merged next-development PR

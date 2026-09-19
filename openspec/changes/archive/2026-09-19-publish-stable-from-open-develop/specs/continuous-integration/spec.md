## MODIFIED Requirements

### Requirement: Publication follows from what was pushed
Publication SHALL use one workflow whose source is the exact current `origin/develop`
commit. It SHALL start nightly or by explicit dispatch; a push or tag alone SHALL NOT
publish. A manual request SHALL provide the intended channel and exact source SHA and
SHALL fail if that SHA is no longer authoritative `develop`.

Nightly and explicit development publication SHALL derive one immutable preview
version from the unique merged pull request associated with the selected source and
publish or verify npm `next`. Stable publication SHALL require explicit stable
dispatch naming a final `x.y.z` version that is not below the open development
version the source declares, and SHALL stamp that version on the source before
packing. No channel SHALL accept a source that does not declare exactly one open
`x.y.z-dev` version. No other workflow SHALL publish.

Every record of a stable release — its tag, GitHub Release, and `master` — SHALL be
written only after the registry serves the verified package, and SHALL name the open
development commit the package was built from. A release tag SHALL NOT be deleted or
moved. An existing development version MAY be a manual no-op or a nightly
exact-registry verification; an existing stable version SHALL be refused.

#### Scenario: Work lands on develop
- **WHEN** a commit declaring a prerelease version is pushed to `develop`
- **THEN** no publication SHALL start solely from that push, and the next nightly or explicit development request MAY select it only while it remains authoritative

#### Scenario: A stable version is requested
- **WHEN** the maintainer command dispatches the stable channel for the current `develop` commit declaring `0.1.8-dev` with version `0.1.8`
- **THEN** the workflow SHALL stamp `0.1.8` on that source, pack it once, validate the exact bytes, publish to `latest`, and write `v0.1.8`, the GitHub Release, and `master` at that same commit only after npm verification

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
publish time on the same kind of open source. Neither SHALL be committed. Between
releases the repository SHALL declare one open prerelease version, and the only
version commit a release costs is the one that reopens the next prerelease after the
stable package is verified on the registry. Merging commits SHALL NOT itself promise
or trigger one preview per commit.

#### Scenario: Several commits land in a row
- **WHEN** three commits are pushed to `develop`
- **THEN** no publication SHALL start from the pushes alone, and a later development request SHALL derive one preview from the then-authoritative source's merged pull request without a version commit

#### Scenario: A release is prepared but not yet tagged
- **WHEN** `develop` declares a stable version, a state no release automation produces any more
- **THEN** development and stable publication SHALL both refuse it until a version-only pull request restores an open prerelease

#### Scenario: A release reopens development
- **WHEN** stable `0.1.8` is verified on the registry from a `develop` declaring `0.1.8-dev`
- **THEN** the maintainer command SHALL prepare one version-only pull request declaring `0.1.9-dev` from the then-current `develop`, which SHALL still declare `0.1.8-dev`, and SHALL report development reopened only after a human merges it

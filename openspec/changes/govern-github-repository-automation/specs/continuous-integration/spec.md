## MODIFIED Requirements

### Requirement: Validation effort matches the change and the channel
Automated validation SHALL scale with what is being shipped. Documentation and
specification changes SHALL require no product build or product test execution, but
SHALL run every lightweight governance consistency check whose scanned inputs they
change; OpenSpec changes SHALL also pass strict OpenSpec validation. Pull requests
into `develop` SHALL require the fast tier for code (typecheck, architecture checks,
unit and contract tests). Preview publication SHALL additionally require exact-
package gates on every supported platform. Stable publication SHALL require the
complete automated suite on every supported platform.

#### Scenario: Docs-only pull request
- **WHEN** every changed path is documentation, an OpenSpec artifact, a Markdown file, `LICENSE`, or `.gitignore`
- **THEN** the required development check SHALL avoid product builds and tests, run strict OpenSpec validation when applicable, and run docs-sensitive governance consistency checks

#### Scenario: Code pull request targets develop
- **WHEN** a pull request changes any non-documentation path
- **THEN** validation SHALL run the fast tier and architecture checks and the required check SHALL gate the merge

#### Scenario: Preview candidate is built
- **WHEN** a preview is published to `next`
- **THEN** validation SHALL run the fast tier and exact packed-candidate gates (package content, clean install) on Windows, Linux, and macOS without requiring the complete suite

#### Scenario: Stable candidate is certified
- **WHEN** a version is published to `latest`
- **THEN** the complete automated suite SHALL pass against the exact final-version package bytes on Windows, Linux, and macOS before publication

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

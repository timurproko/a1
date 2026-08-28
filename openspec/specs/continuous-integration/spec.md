# Continuous Integration Specification

## Purpose

Defines proportionate automated validation: fast checks during development, package gates for previews, and the complete suite only for stable releases.

## Requirements

### Requirement: Validation effort matches the change and the channel
Automated validation SHALL scale with what is being shipped. Documentation and
specification changes SHALL require no test execution. Pull requests into `develop`
SHALL require the fast tier (typecheck, architecture checks, unit and contract
tests). Preview publication SHALL additionally require exact-package gates on every
supported platform. Stable publication SHALL require the complete automated suite on
every supported platform.

#### Scenario: Docs-only pull request
- **WHEN** every changed path is documentation, an OpenSpec artifact, a Markdown file, `LICENSE`, or `.gitignore`
- **THEN** the required development check SHALL pass without executing build, test, or architecture gates

#### Scenario: Code pull request targets develop
- **WHEN** a pull request changes any non-documentation path
- **THEN** validation SHALL run the fast tier and architecture checks and the required check SHALL gate the merge

#### Scenario: Preview candidate is built
- **WHEN** a preview is published to `next`
- **THEN** validation SHALL run the fast tier and exact packed-candidate gates (package content, clean install) on Windows, Linux, and macOS without requiring the complete suite

#### Scenario: Stable candidate is certified
- **WHEN** a version is published to `latest`
- **THEN** the complete automated suite SHALL pass against the exact final-version package bytes on Windows, Linux, and macOS before publication

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
Publication SHALL be triggered by pushes to `develop` rather than by manual
dispatch or by a tag, and one workflow SHALL serve both channels. What the pushed
commit declares SHALL decide the channel: a prerelease version SHALL publish a
preview to the npm `next` tag, and a stable version SHALL publish that version to
the npm `latest` tag. No other workflow SHALL publish.

Every record of a stable release — its tag, its GitHub Release, and the branch that
names the current release — SHALL be written only after the registry serves the
published package. A release that does not complete SHALL therefore leave no tag, no
GitHub Release, and no moved branch. A release tag SHALL NOT be deleted or moved
once written, which is possible precisely because it is written last.

Publication SHALL refuse a version the registry already serves, and SHALL verify
afterwards that the registry serves the exact bytes that were uploaded under the
intended channel.

#### Scenario: Work lands on develop
- **WHEN** a commit declaring a prerelease version is pushed to `develop`
- **THEN** a preview SHALL be published to the npm `next` tag without any further instruction

#### Scenario: A release tag is pushed
- **WHEN** a commit declaring a stable version is pushed to `develop`
- **THEN** that version SHALL be published to the npm `latest` tag
- **AND** its tag and GitHub Release SHALL be written afterwards, naming that commit

#### Scenario: A tag disagrees with its commit
- **WHEN** a release fails at any point before the registry serves the package
- **THEN** no tag, GitHub Release, or moved branch SHALL exist for that version

#### Scenario: A version is already published
- **WHEN** the resolved version already exists on the registry
- **THEN** publication SHALL fail before packing anything

### Requirement: Preview versions cost no commits
A preview version SHALL be derived at publish time from the version the repository
declares, and SHALL NOT be committed. Between releases the repository SHALL declare
one open prerelease version, and each preview SHALL be distinguished from the last
without a commit.

A commit declaring a stable version SHALL publish that release rather than a
preview, so the repository never declares a version that nothing publishes.

#### Scenario: Several commits land in a row
- **WHEN** three commits are pushed to `develop`
- **THEN** three distinct previews SHALL be published and no version commit SHALL be created

#### Scenario: A release is prepared but not yet tagged
- **WHEN** `develop` declares a stable version
- **THEN** that version SHALL be published to `latest` rather than published as a preview

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

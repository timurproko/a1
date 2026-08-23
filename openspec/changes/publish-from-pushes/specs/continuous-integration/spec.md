## ADDED Requirements

### Requirement: Publication follows from what was pushed
Publication SHALL be triggered by pushes rather than by manual dispatch, and one
workflow SHALL serve both channels. A push to `develop` SHALL publish a preview to
the npm `next` tag. A pushed `v<version>` tag SHALL publish that version to the npm
`latest` tag and record a GitHub Release for it. No other workflow SHALL publish.

A release tag SHALL name a commit that already declares the version the tag names,
and publication SHALL fail before contacting the registry when they disagree. A
release tag SHALL NOT be deleted or moved once pushed.

Publication SHALL refuse a version the registry already serves, and SHALL verify
afterwards that the registry serves the exact bytes that were uploaded under the
intended channel.

#### Scenario: Work lands on develop
- **WHEN** a commit is pushed to `develop`
- **THEN** a preview SHALL be published to the npm `next` tag without any further instruction

#### Scenario: A release tag is pushed
- **WHEN** `v<version>` is pushed
- **THEN** that version SHALL be published to the npm `latest` tag and a GitHub Release SHALL record it

#### Scenario: A tag disagrees with its commit
- **WHEN** `v<version>` names a commit whose package declares a different version
- **THEN** publication SHALL fail before contacting the registry

#### Scenario: A version is already published
- **WHEN** the resolved version already exists on the registry
- **THEN** publication SHALL fail before packing anything

### Requirement: Preview versions cost no commits
A preview version SHALL be derived at publish time from the version the repository
declares, and SHALL NOT be committed. Between releases the repository SHALL declare
one open prerelease version, and each preview SHALL be distinguished from the last
without a commit.

While the repository declares a stable version — the window between preparing a
release and tagging it — no preview SHALL be published, because a prerelease of that
version would rank below the release itself.

#### Scenario: Several commits land in a row
- **WHEN** three commits are pushed to `develop`
- **THEN** three distinct previews SHALL be published and no version commit SHALL be created

#### Scenario: A release is prepared but not yet tagged
- **WHEN** `develop` declares a stable version that has no tag yet
- **THEN** no preview SHALL be published, and the pipeline SHALL say why

### Requirement: A stable release is not visible until npm has it
The GitHub Release for a stable version SHALL be staged as a draft before the
registry is contacted, published only after the registry accepted the bytes, and
removed if publication did not complete.

#### Scenario: npm rejects the upload
- **WHEN** publication fails after the draft release exists
- **THEN** the draft SHALL be removed and no release SHALL be visible for that version

#### Scenario: npm accepts the upload
- **WHEN** the registry serves the published version
- **THEN** the staged release SHALL be published

## MODIFIED Requirements

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
`develop`, which SHALL be the only protected branch. Release tags SHALL be protected
from deletion and movement and SHALL carry no check of their own, because a tag is
cut from a commit that has already been validated. Publication SHALL NOT serve as
the first automated validation of a change.

#### Scenario: Required check has not passed
- **WHEN** a pull request targets `develop` and its required check is absent or unsuccessful
- **THEN** GitHub SHALL prevent the merge

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

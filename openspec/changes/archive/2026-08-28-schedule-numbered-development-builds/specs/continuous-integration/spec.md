## ADDED Requirements

### Requirement: Development previews publish on a schedule or explicit request
A merge or direct push to `develop` SHALL NOT by itself publish a development
preview. Development-preview publication SHALL start only from the nightly schedule
at `03:17 UTC` or from an explicit `npm run develop` maintainer request. Each trigger
SHALL select the then-current commit of authoritative `origin/develop`; it SHALL NOT
publish an uncommitted tree, a maintainer's stale local branch, or locally rebuilt
package bytes.

`npm run develop` SHALL dispatch the authoritative GitHub Actions publication path,
wait for its terminal result, and report the exact preview version that was
published or already existed. When the version is absent, the workflow SHALL pack
once, run the preview gates against the final-version bytes on every supported
platform, publish those exact bytes to npm `next`, and preserve npm provenance. The
workstation SHALL NOT contact npm to publish.

The nightly workflow SHALL always run complete non-physical verification. When the
numbered preview exists, nightly SHALL obtain the exact package npm serves and use
it for package and update verification rather than rebuild immutable package bytes.
When it does not exist, nightly SHALL pack the final-version candidate once, run the
complete suite against those exact bytes, and publish those bytes only after every
gate passes.

The final registry check and publish operation SHALL be serialized across manual
and nightly triggers. An overlapping trigger that finds the immutable numbered
version after waiting SHALL finish successfully without changing npm.

#### Scenario: Several changes land during the day
- **WHEN** several commits merge into `develop` between development-publication triggers
- **THEN** no per-commit preview SHALL publish, and the next trigger SHALL select the current `origin/develop` head once

#### Scenario: Nightly development verification starts
- **WHEN** the nightly schedule fires
- **THEN** GitHub Actions SHALL build and run the complete non-physical verification for the current `origin/develop` head even when that head has not changed since the preceding nightly run

#### Scenario: A verified nightly preview does not exist
- **WHEN** nightly verification passes and npm does not contain the selected head's numbered preview
- **THEN** the exact fully verified candidate SHALL publish to npm `next`

#### Scenario: Nightly verifies an already published preview
- **WHEN** npm already contains the selected head's numbered preview when nightly verification starts
- **THEN** nightly SHALL run the complete suite using the exact registry package and the publication phase SHALL complete successfully without rebuilding, overwriting, republishing, or moving a dist-tag

#### Scenario: Complete nightly verification fails
- **WHEN** any required complete-verification gate fails
- **THEN** the nightly workflow SHALL fail and SHALL NOT publish a new preview

#### Scenario: A maintainer requests a development publication
- **WHEN** a maintainer runs `npm run develop` from an authorized checkout and the selected numbered preview does not exist
- **THEN** the command SHALL request one GitHub Actions development publication for the current authoritative `origin/develop` head, wait for it, and report the published version without publishing from the workstation

#### Scenario: A maintainer requests an existing development preview
- **WHEN** a maintainer runs `npm run develop` and npm already contains the preview numbered for the current `origin/develop` head
- **THEN** the request SHALL complete successfully and report the existing version without building, overwriting, republishing, or moving a dist-tag

#### Scenario: Manual and nightly triggers overlap
- **WHEN** manual and nightly triggers select the same numbered preview concurrently
- **THEN** the serialized final registry check SHALL permit at most one publication and the other trigger SHALL finish successfully without changing npm

### Requirement: Development previews are named by merged pull request
A development preview SHALL be published as
`<major.minor.patch>-dev.<pull-request-number>`, where `pull-request-number` is the
positive decimal number of the unique merged pull request associated with the
selected `develop` commit. The workflow SHALL resolve that association from GitHub
rather than parsing a commit subject. It SHALL refuse to guess when the selected
commit has no unique merged pull request.

A nightly workflow run has no pull request of its own. It SHALL select the current
`develop` head and use the merged pull request that produced that commit, so a
nightly build follows the number GitHub presents as `develop (#<number>)`.

The preview version SHALL be stamped only into the package being built and SHALL
NOT create or require a version commit. A short commit hash or GitHub Actions run
number SHALL NOT be used as the prerelease identifier.

#### Scenario: GitHub presents develop pull request 107
- **WHEN** a development trigger selects the `develop` commit uniquely associated with merged pull request `107`
- **THEN** a repository line declaring `0.1.8-dev` SHALL produce preview version `0.1.8-dev.107`

#### Scenario: Nightly selects the current develop head
- **WHEN** the nightly trigger selects a `develop` head produced by merged pull request `108`
- **THEN** it SHALL use `108` even though the scheduled workflow run itself has no pull request

#### Scenario: The selected commit has no unique pull request
- **WHEN** GitHub reports no merged pull request or more than one merged pull request for the selected `develop` commit
- **THEN** development publication SHALL fail before packing rather than guessing a number

#### Scenario: A development preview is packed
- **WHEN** the final preview version is selected
- **THEN** candidate evidence SHALL bind the selected source commit, pull request number, final package version, and tarball digest before publication

#### Scenario: A preview would reuse a published pull request number
- **WHEN** the selected pull request number already names a version on npm
- **THEN** publication SHALL be an idempotent successful no-op and SHALL NOT overwrite or rebuild that immutable npm version

### Requirement: Stable publication is explicitly dispatched
A push SHALL NOT publish a stable release. After `npm run release` lands the stable
version on `develop` through its version pull request, the command SHALL explicitly
dispatch authoritative stable publication for that exact `origin/develop` commit
and SHALL wait for its terminal result before opening the next development line.

Stable publication SHALL retain the complete exact-byte gates, npm provenance,
`latest` publication, immutable release tag, GitHub Release, and `master`
fast-forward guarantees. Development and nightly triggers SHALL NOT publish a
commit declaring a stable version.

#### Scenario: A stable version pull request merges
- **WHEN** `npm run release` observes the stable version on authoritative `origin/develop`
- **THEN** it SHALL dispatch stable publication for that exact commit and wait for success before continuing

#### Scenario: A stable version is merely pushed
- **WHEN** a commit declaring a stable version reaches `develop` without an authorized release dispatch
- **THEN** no publication SHALL start from the push alone

#### Scenario: A development trigger selects a stable version
- **WHEN** manual or nightly development automation selects a commit declaring a stable version
- **THEN** it SHALL refuse development publication without constructing a preview version

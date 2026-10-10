## MODIFIED Requirements

### Requirement: Preview and stable artifacts are published from verified bytes
Every npm artifact required by a release, including `@timurproko/a1` and `@timurproko/a1-install`, SHALL be packed once for its final version, validated in that exact form, and uploaded without rebuilding. The publisher SHALL independently verify each package digest before upload and SHALL verify that registry bytes are the bytes validated for that package identity. Post-upload verification SHALL read each package's exact-version registry resource and the package's dedicated dist-tag resource, SHALL validate the returned package name and version in addition to integrity and shasum, and SHALL NOT require an independently cached package-wide metadata document to enumerate the newly published version.

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

#### Scenario: Package-wide metadata remains stale after upload
- **WHEN** npm's package-wide metadata document does not yet enumerate a newly uploaded version but both exact-version resources serve the validated identities and digests and both dedicated dist-tag resources select that version
- **THEN** registry verification SHALL succeed without waiting for the unrelated package-wide document
- **AND** required published-pair smoke and completion SHALL retain their existing eligibility

#### Scenario: An exact registry resource is absent or differs
- **WHEN** either exact-version resource remains absent, returns another identity or version, differs from the validated integrity or shasum, or its dedicated requested dist-tag selects another version
- **THEN** publication SHALL keep polling only within its existing bounded ingestion allowance and SHALL fail closed if the exact pair does not verify

#### Scenario: Installer publication fails after an application artifact exists
- **WHEN** one immutable package upload succeeds but the required pair is not completely verified
- **THEN** the workflow SHALL fail without uploading the Release asset or moving `master`, and SHALL keep the published Release and tag
- **AND** a rerun of the failed jobs SHALL verify existing immutable bytes rather than republish or rebuild them

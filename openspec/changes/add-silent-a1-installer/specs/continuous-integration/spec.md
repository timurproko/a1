## MODIFIED Requirements

### Requirement: Preview and stable artifacts are published from verified bytes
Every npm artifact required by a release, including `@timurproko/a1` and `@timurproko/a1-installer`, SHALL be packed once for its final version, validated in that exact form, and uploaded without rebuilding. The publisher SHALL independently verify each package digest before upload and SHALL verify that registry bytes are the bytes validated for that package identity.

The installer artifact SHALL be built from the same authoritative source and selected version as the corresponding application publication but SHALL retain its distinct package identity and minimal package surface. Development publication SHALL place matching installer builds under `next`; stable publication SHALL place the stable installer under `latest`. Stable release tags, GitHub Releases, and `master` movement SHALL wait until every required artifact has been registry-verified.

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
- **AND** stable release records SHALL be written only after both required registry results succeed

#### Scenario: Installer publication fails after an application artifact exists
- **WHEN** one immutable package upload succeeds but the required pair is not completely verified
- **THEN** the workflow SHALL fail without writing a stable tag, GitHub Release, or `master` movement
- **AND** a retry SHALL verify existing immutable bytes rather than republish or rebuild them

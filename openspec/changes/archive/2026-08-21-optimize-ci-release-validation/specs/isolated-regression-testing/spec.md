## MODIFIED Requirements

### Requirement: Uncertified development previews are explicit
A manually accepted `-dev.N` candidate MAY publish under npm tag `next` after repository-wide invariant and smoke gates, deterministically selected affected architecture, structural, lifecycle, update, dependency, and integration scopes, and exact package-content and artifact-identity checks pass. Expensive unaffected integration and clean consumer-install coverage MAY be deferred to scheduled full regression unless a packaging-sensitive input changed. The preview SHALL identify physical, complete-regression, and cross-platform certification status explicitly, SHALL NOT move `latest`, and SHALL NOT claim certified terminal parity or platform support.

#### Scenario: Physical workers are unavailable
- **WHEN** a candidate passes its mandatory and affected non-desktop gates and manual acceptance but physical certification is deferred
- **THEN** publication MAY proceed only as an explicitly uncertified development preview

#### Scenario: Ordinary feature preview is requested
- **WHEN** deterministic impact selection proves the change does not affect packaging, dependencies, release behavior, or a global contract
- **THEN** the preview MAY omit the clean consumer package-install gate while still validating mandatory invariants, affected scopes, package contents, and exact candidate identity

#### Scenario: Packaging-sensitive preview is requested
- **WHEN** a manifest, lockfile, build configuration, package entry, product identity authority, release script, or other declared packaging-sensitive input changes
- **THEN** the preview SHALL pass clean installation of the exact packed candidate before publication

#### Scenario: Stable publication is requested
- **WHEN** a candidate would move `latest` or claim terminal support on a platform
- **THEN** complete automated, clean-package, deferred physical, and cross-platform certification SHALL complete against the exact candidate first

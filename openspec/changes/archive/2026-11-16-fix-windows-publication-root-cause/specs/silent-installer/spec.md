## MODIFIED Requirements

### Requirement: Existing installations retain cancellation-safe replacement
Before starting direct global installation, the installer SHALL distinguish an absent A1 package from a canonical valid existing installation. It MAY directly install only when no existing global A1 package owns the target location, except for explicitly requested capsule-verified legacy repair. When a valid supported A1 installation and complete launcher set already exist, ordinary installation SHALL map stable, development-channel, and exact-development-version selection to that installation's cancellation-safe update forms while capturing its streams behind the installer presentation.

Before delegation, the installer SHALL resolve its active npm JavaScript entry, canonicalize it, require a regular file, and supply that exact identity to the installed updater as npm execution context. An npx-cli.js acquisition context MAY normalize only to its fixed sibling npm-cli.js after the same validation. This context SHALL affect npm acquisition only: package destination, target, launcher set, transaction, replacement, cancellation, activation, and rollback authority SHALL remain with the verified installed updater. A delegated failure SHALL NOT fall through to direct package installation or overwrite.

A linked, foreign, malformed, partial, unsupported, mismatched, or ambiguously owned existing package or launcher set SHALL be refused before mutation unless --repair explicitly names a known legacy Windows recovery capsule whose digest, transaction, target, canonical prefix, complete launcher authority, prior release, and dead recorded owners validate independently of the partial tree. Repair SHALL refuse live package or recovery writers, pin npm installation to that prefix, activate using the capsule's data directory, preserve settings and user data, and verify the exact installed manifest and callable launcher before success. Ordinary delegation SHALL never implicitly enable repair.

#### Scenario: A1 is not installed
- **WHEN** the canonical active global root contains no A1 package or launcher ownership
- **THEN** the installer SHALL use its fresh global installation path

#### Scenario: A1 is already installed validly
- **WHEN** a supported canonical A1 package and complete launcher set are present without explicit verified repair
- **THEN** the installer SHALL resolve canonical npm execution context and use the installed cancellation-safe update path rather than an unguarded direct overwrite
- **AND** successful child output SHALL remain hidden behind the installer transcript

#### Scenario: Existing installation receives npm through npx
- **WHEN** npm acquired the installer with an npx-cli.js execution context and the fixed sibling npm-cli.js is a canonical regular file
- **THEN** the installer SHALL supply that npm entry to the delegated updater
- **AND** SHALL NOT treat the npx entry, a shell wrapper, or a searched arbitrary file as replacement authority

#### Scenario: An existing installation receives an exact target
- **WHEN** a supported existing installation is valid and ordinary installation selected 0.1.8-dev.107
- **THEN** the installer SHALL delegate through a1 update --develop with the full development version and validated npm execution context rather than directly overwrite the package

#### Scenario: Delegated update fails
- **WHEN** the verified installed updater returns an unsuccessful result before or after replacement begins
- **THEN** the installer SHALL preserve that unsuccessful verdict and the updater's recovery/rollback disposition
- **AND** SHALL NOT retry through its fresh global installation path or print installation success

#### Scenario: Existing ownership is ambiguous
- **WHEN** the package path or launcher set is linked, foreign, partial, mismatched, unsupported, or cannot be verified and no valid explicit repair authority exists
- **THEN** the installer SHALL fail before global mutation with no success text
- **AND** SHALL leave the observed package, launchers, processes, and A1 user data unchanged

#### Scenario: Explicit legacy repair after all writers settle
- **WHEN** --repair names a validated known legacy capsule, its selected exact target matches, and recorded owners and package writers are no longer running
- **THEN** the installer SHALL install directly into the authenticated prefix and activate the exact target without delegating to the partial predecessor
- **AND** successful installation SHALL preserve user data and use the ordinary final manifest, launcher, and command-resolution checks

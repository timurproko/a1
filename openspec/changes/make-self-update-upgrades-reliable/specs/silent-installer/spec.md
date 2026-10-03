## MODIFIED Requirements

### Requirement: Existing installations retain cancellation-safe replacement
Before starting direct global installation, the installer SHALL distinguish an absent A1 package from a canonical valid existing installation. It MAY directly install only when no existing global A1 package owns the target location. When a valid supported A1 installation and complete launcher set already exist, the installer SHALL map stable, development-channel, and exact-development-version selection to that installation's cancellation-safe update forms while capturing its streams behind the installer presentation.

Before delegation, the installer SHALL resolve its active npm JavaScript entry, canonicalize it, require a regular file, and supply that exact identity to the installed updater as npm execution context. An `npx-cli.js` acquisition context MAY normalize only to its fixed sibling `npm-cli.js` after the same validation. This context SHALL affect npm acquisition only: package destination, target, launcher set, transaction, replacement, cancellation, activation, and rollback authority SHALL remain with the verified installed updater. A delegated failure SHALL NOT fall through to direct package installation or overwrite.

A linked, foreign, malformed, partial, unsupported, mismatched, or ambiguously owned existing package or launcher set SHALL be refused before mutation. The installer SHALL NOT delete, rename, adopt, or directly overwrite such a tree.

#### Scenario: A1 is not installed
- **WHEN** the canonical active global root contains no A1 package or launcher ownership
- **THEN** the installer SHALL use its fresh global installation path

#### Scenario: A1 is already installed validly
- **WHEN** a supported canonical A1 package and complete launcher set are present
- **THEN** the installer SHALL resolve canonical npm execution context and use the installed cancellation-safe update path rather than an unguarded direct overwrite
- **AND** successful child output SHALL remain hidden behind the installer transcript

#### Scenario: Existing installation receives npm through npx
- **WHEN** npm acquired the installer with an `npx-cli.js` execution context and the fixed sibling `npm-cli.js` is a canonical regular file
- **THEN** the installer SHALL supply that npm entry to the delegated updater
- **AND** SHALL NOT treat the npx entry, a shell wrapper, or a searched arbitrary file as replacement authority

#### Scenario: An existing installation receives an exact target
- **WHEN** a supported existing installation is valid and the installer selected `0.1.8-dev.107`
- **THEN** the installer SHALL delegate through `a1 update --develop <full-development-version>` with validated npm execution context rather than directly overwrite the package

#### Scenario: Delegated update fails
- **WHEN** the verified installed updater returns an unsuccessful result before or after replacement begins
- **THEN** the installer SHALL preserve that unsuccessful verdict and the updater's recovery/rollback disposition
- **AND** SHALL NOT retry through its fresh global installation path or print installation success

#### Scenario: Existing ownership is ambiguous
- **WHEN** the package path or launcher set is linked, foreign, partial, mismatched, unsupported, or cannot be verified
- **THEN** the installer SHALL fail before global mutation with no success text
- **AND** SHALL leave the observed package, launchers, processes, and A1 user data unchanged

## MODIFIED Requirements

### Requirement: The official installer bootstrap is minimal before custom installation begins
The preferred stable installation command SHALL be `npm x -y -- @timurproko/a1-install`. The development form SHALL append `--develop`, and an exact development form SHALL append `--develop <preview-or-version>`. Every preferred form SHALL retain the explicit `--` boundary between npm-owned options and the package executable so installer selectors are forwarded unchanged. Forms without `-y` SHALL also work and MAY show npm's first-use confirmation. The installer package SHALL expose exactly one `a1-install` executable, SHALL use only supported Node built-ins at runtime, and SHALL declare no production, optional, peer, or runtime-required development dependency, funding metadata, or npm installation lifecycle script.

The dependency-free outer acquisition SHALL introduce no package-originated deprecation, lifecycle-script, dependency-funding, or audit transcript. npm MAY show its own minor bootstrap/version notice or acquisition error before installer execution; those outer messages are not part of the installer-owned transcript. The corresponding direct global npm commands for `@latest`, `@next`, and an exact numbered development version MAY remain documented as explicit manual or recovery fallbacks but SHALL NOT be presented as the preferred controlled paths after installer availability is accepted.

#### Scenario: A user starts the preferred installation
- **WHEN** the user runs `npm x -y -- @timurproko/a1-install`
- **THEN** npm SHALL acquire the dependency-free installer without a first-use confirmation
- **AND** the installer SHALL own subsequent main-install terminal presentation

#### Scenario: A user omits automatic confirmation
- **WHEN** the user runs `npm x -- @timurproko/a1-install`
- **THEN** the same installer SHALL run after any npm-owned first-use confirmation
- **AND** minor outer npm bootstrap text SHALL NOT permit the main A1 child transcript to leak

#### Scenario: A user selects the development channel
- **WHEN** the user appends `--develop` after `@timurproko/a1-install`
- **THEN** `npm x` SHALL forward the selector to the installer across the explicit argument boundary
- **AND** the installer SHALL resolve A1's `next` channel rather than changing the installer package channel

#### Scenario: A user selects an exact development version
- **WHEN** the user appends `--develop 107` or `--develop 0.1.8-dev.107` after `@timurproko/a1-install`
- **THEN** `npm x` SHALL forward the selector and value to the installer across the explicit argument boundary
- **AND** the installer SHALL select only the uniquely matching immutable published A1 preview

#### Scenario: Installer acquisition fails
- **WHEN** npm cannot acquire the installer package and its executable never starts
- **THEN** npm MAY emit its own acquisition error
- **AND** no A1 success message SHALL appear

#### Scenario: The installer tarball is inspected
- **WHEN** the exact `@timurproko/a1-install` artifact is unpacked
- **THEN** it SHALL contain exactly the declared installer executable and required metadata/assets
- **AND** its manifest SHALL contain no funding metadata, install lifecycle script, or runtime dependency graph capable of producing transitive warning output

### Requirement: Fresh installation and self-update share one target grammar
The installer SHALL use the same release-target grammar as A1 self-update. Bare invocation SHALL select the stable `latest` channel. `--develop` without a value SHALL select the moving development `next` channel. `--develop <positive-preview-number>` SHALL select the unique published development version carrying that preview number, and `--develop <full-development-version>` SHALL select that exact published preview.

The published application version list SHALL remain authoritative for requested previews. An absent or ambiguous numeric preview, absent exact preview, stable version after `--develop`, zero or malformed preview, repeated selector, missing usable selector value, unsupported option, or extra argument SHALL fail before installation mutation. The installer SHALL NOT support `--version`, `--latest`, or `--next` as compatibility aliases. npm package suffixes on `@timurproko/a1-install` SHALL remain installer-acquisition selectors and SHALL NOT be interpreted as application-target syntax.

When an existing valid installation receives an exact preview request, the installer SHALL delegate through `a1 update --develop <full-development-version>`. Documentation and help SHALL present only this aligned grammar through the preferred `npm x -y -- @timurproko/a1-install` invocation.

#### Scenario: A user selects stable installation
- **WHEN** the user runs `npm x -y -- @timurproko/a1-install`
- **THEN** the installer SHALL resolve and install the application package's `latest` channel
- **AND** the form SHALL match bare `a1 update` for an existing installation

#### Scenario: A user selects the development head
- **WHEN** the user runs `npm x -y -- @timurproko/a1-install --develop`
- **THEN** the installer SHALL resolve and install the application package's `next` channel
- **AND** the form SHALL match `a1 update --develop`

#### Scenario: A user selects a numbered preview
- **WHEN** the user runs `npm x -y -- @timurproko/a1-install --develop 107`
- **THEN** the installer SHALL inspect published application versions and select the unique version ending in `-dev.107`
- **AND** it SHALL fail rather than guess when that number is absent or ambiguous

#### Scenario: A user selects an exact preview
- **WHEN** the user runs `npm x -y -- @timurproko/a1-install --develop 0.1.8-dev.107`
- **THEN** the installer SHALL select that version only when the registry lists it
- **AND** the form SHALL match `a1 update --develop 0.1.8-dev.107`

#### Scenario: A removed selector is supplied
- **WHEN** the user supplies `--version`, `--latest`, or `--next`
- **THEN** the installer SHALL reject the unsupported option before registry discovery or installation
- **AND** help and documentation SHALL NOT advertise a compatibility alias

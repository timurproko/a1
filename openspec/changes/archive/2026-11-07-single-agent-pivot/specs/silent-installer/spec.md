## ADDED Requirements

### Requirement: An installation at or above the target reports success
After resolution or delegated update, an installed application whose version is equal to or newer than the resolved target on the same channel SHALL be reported as installed with status zero. A failure SHALL keep its single concise `installation failed: <reason>` line and, when diagnostics were recorded, add one `Details: <log path>` line naming a private log file, without requiring `--verbose`; the explicit verbose mode keeps printing its bounded inline diagnostics instead.

#### Scenario: The channel head is older than the installation
- **WHEN** the installed development build is newer than the current `next` head
- **THEN** the installer SHALL report success and SHALL NOT report a version mismatch

## MODIFIED Requirements

### Requirement: Installation resolves and verifies one exact target
The installer SHALL use the active npm executable and configuration to resolve the stable `latest` channel by default, the development `next` channel for bare `--develop`, or one immutable published numbered development version for `--develop <preview-or-version>`. It SHALL validate the authoritative `@timurproko/a1` identity and one exact semantic version and SHALL pass that exact version rather than a moving tag to the global mutating command. A numeric preview SHALL resolve only when exactly one published application version ends in that development number; a full preview SHALL resolve only when that exact version is published. It SHALL use cross-platform fixed argument arrays, SHALL NOT construct an interpolated shell command, and SHALL NOT persistently change npm configuration. Zero-numbered or malformed previews, duplicate selectors, unsupported options, ambiguous preview numbers, and extra arguments SHALL fail before installation mutation.

A fresh installation SHALL report success only after npm exits successfully, the canonical global package path identifies the exact target and expected package role, the complete platform launcher set targets that package, the installed tree's declared activation contract reports completion, the exact release is active, and command resolution selects the installed launcher rather than a stale or foreign executable. Command resolution SHALL use the invoking PATH, extended with the per-user `bin` directory only when the installer activated it for future shells under the per-user prefix requirement. A later ordinary launch SHALL not need to print installation or activation output. Normal success SHALL keep every verified path private.

#### Scenario: The stable channel is resolved
- **WHEN** active npm reports a valid latest A1 version for a bare installer invocation
- **THEN** the installer SHALL globally install `@timurproko/a1@<that-exact-version>` with fixed arguments and captured streams
- **AND** SHALL NOT mutate npmrc or global/user npm settings

#### Scenario: The development channel is resolved
- **WHEN** the installer receives bare `--develop` and active npm reports a valid A1 `next` version
- **THEN** the installer SHALL globally install that exact resolved development version with fixed arguments

#### Scenario: A numbered development preview is selected
- **WHEN** the installer receives `--develop 107` and npm lists exactly one published version ending in `-dev.107`
- **THEN** the global mutating command SHALL name that exact published version
- **AND** SHALL perform no moving-channel selection

#### Scenario: An exact development version is selected
- **WHEN** the installer receives `--develop 0.1.8-dev.107` and npm lists that exact publication
- **THEN** the global mutating command SHALL name exactly `@timurproko/a1@0.1.8-dev.107`
- **AND** SHALL perform no moving-channel selection

#### Scenario: Target selectors conflict
- **WHEN** a selector is repeated, a preview is zero-numbered or malformed, a numeric preview is absent or ambiguous, an exact preview is absent, or an unsupported option or extra argument is supplied
- **THEN** the installer SHALL fail before installation mutation

#### Scenario: npm exits zero but the target is incomplete
- **WHEN** package identity, version, role, launcher ownership, activation verdict, or active release does not match the resolved target
- **THEN** the installer SHALL fail without printing the success message

#### Scenario: Installation is complete
- **WHEN** package installation, launcher verification, immutable materialization, certification, warmup, active-reference commit, and command-resolution verification all succeed for the exact target
- **THEN** the installer SHALL print its exact success result without printing the installation destination
- **AND** the next `a1` invocation SHALL use the already active release without installation diagnostics

#### Scenario: Another launcher wins command resolution
- **WHEN** the installed launcher set is complete but the invoking environment, including any activated per-user `bin` directory, resolves `a1` to a stale or foreign launcher
- **THEN** the installer SHALL not report complete success
- **AND** SHALL emit one concise actionable result without exposing the conflicting path unless verbose diagnostics are requested

## REMOVED Requirements

### Requirement: An installation at or above the target is success
**Reason**: Restated under a new name without its resident-tab, supervisor, launch-guardian, containment, native-host, or timestamp scenarios, which no longer describe the single-agent product.

**Migration**: See the ADDED requirement "An installation at or above the target reports success".

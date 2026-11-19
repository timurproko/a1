## ADDED Requirements

### Requirement: Exact-package gates prove silent installation behavior
Release validation SHALL exercise the exact packed installer artifact against the exact packed A1 candidate in isolated global prefixes without reading or mutating the runner's ordinary A1 profile, release store, sessions, credentials, npm prefix, or npm configuration. Evidence SHALL cover Windows Node 22/24, Linux Node 24, and macOS Node 24 and SHALL verify package surface, fixed npm arguments, exact target pinning, child-stream isolation, safe phase classification, progress/terminal cleanup, platform launchers, command resolution, activation completion, existing-install delegation, failure, cancellation, and retry.

A successful-warning fixture SHALL emit representative npm deprecation, funding, lifecycle-policy, package-count, and npm-version text from the child while completing installation. Interactive capture SHALL observe only the installer progress row with at most one allowlisted phase and the exact success line; redirected capture SHALL observe only the exact success line. Neither SHALL expose the destination, prefix, package/launcher/user path, target version, dependency identity, or count. Negative controls SHALL fail if child stdio is inherited, arbitrary verbose text becomes a phase, a moving tag reaches the mutating install command, activation is skipped, terminal state remains modified, or success is printed before launcher/active-target/command-resolution verification.

#### Scenario: The exact candidate installs successfully with noisy npm output
- **WHEN** the packed installer drives a successful child that emits representative warnings and notices while installing the exact packed A1 candidate
- **THEN** terminal evidence SHALL contain one conforming progress row with at most one allowlisted phase followed by exactly `a1 successfully installed`, without an installation destination or dependency transcript
- **AND** package identity, launcher forms, command resolution, activation, active version, terminal restoration, and clean subsequent launch SHALL be verified from the isolated prefix/state

#### Scenario: Installation output is redirected
- **WHEN** the same exact installation succeeds with non-interactive stdout
- **THEN** captured stdout SHALL contain only `a1 successfully installed` and one newline
- **AND** stderr SHALL be empty

#### Scenario: The exact child fails
- **WHEN** npm startup, network/registry simulation, permission, package verification, launcher verification, or activation fails
- **THEN** the installer SHALL return nonzero with one bounded A1-owned default failure result, no success text, and no raw warning transcript or secret-bearing fixture value

#### Scenario: An installation already exists
- **WHEN** an isolated prefix contains a valid supported older A1 package and launcher set
- **THEN** evidence SHALL show delegation to the installed cancellation-safe updater rather than direct unguarded replacement
- **AND** ambiguous or foreign ownership negative controls SHALL fail before mutation

#### Scenario: Fresh installation is interrupted and retried
- **WHEN** cancellation interrupts controlled npm mutation and the installer is run again
- **THEN** the first run SHALL report no success and SHALL delete no uncertain global tree
- **AND** the retry SHALL either complete exact verification or fail truthfully without deleting user-data sentinels

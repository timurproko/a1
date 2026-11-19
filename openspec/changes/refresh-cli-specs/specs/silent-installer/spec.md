## MODIFIED Requirements

### Requirement: The official installer bootstrap is minimal before custom installation begins
The preferred stable installation command SHALL be `npm x -y -- @timurproko/a1-install`. The development form SHALL append `--develop`, and an exact development form SHALL append `--develop <preview-or-version>`. Every preferred form SHALL retain the explicit `--` boundary between npm-owned options and the package executable so installer selectors are forwarded unchanged. Forms without `-y` SHALL also work and MAY show npm's first-use confirmation. The installer package SHALL expose exactly one `a1-install` executable, SHALL use only supported Node built-ins at runtime, and SHALL declare no production, optional, peer, or runtime-required development dependency, funding metadata, or npm installation lifecycle script.

The dependency-free outer acquisition SHALL introduce no package-originated deprecation, lifecycle-script, dependency-funding, or audit transcript. npm MAY show its own minor bootstrap/version notice or acquisition error before installer execution; those outer messages are not part of the installer-owned transcript. The README SHALL present only the installer forms as the way to install; the corresponding direct global npm commands for `@latest`, `@next`, and an exact numbered development version are manual fallbacks and SHALL NOT be presented as the preferred path.

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

### Requirement: Installation failures are concise and truthful
After installer execution begins, a failure SHALL clear the progress row, restore cursor visibility and terminal styling, write no success text, return a nonzero status, and emit one default stderr line in the form `installation failed: <concise reason>`. The concise reason SHALL come from this fixed vocabulary: `invalid command arguments`, `--verbose was supplied more than once`, `--develop was supplied more than once`, `--repair requires one absolute recovery capsule path`, `--help cannot be combined with another option`, `unsupported option`, `unexpected argument`, `npm is unavailable`, `could not resolve the selected release`, `the selected release was not found`, `network access failed`, `registry authentication failed`, `permission was denied`, `npm installation failed`, `the npm global installation cannot be verified`, `the installed package is incomplete`, `the installed package identity is invalid`, `the installed version does not match the selected release`, `launcher verification failed`, `the installed command is not active in this shell`, `another command takes precedence`, `activation failed`, `existing installation ownership could not be verified`, `existing installation could not be updated`, `repair data directory differs from the recovery capsule`, or `unexpected installer failure`. An argument failure SHALL return status `2`. A failed delegated update SHALL return the installed updater's own status. Every other failure SHALL return status `1`.

The installer SHALL accept every Node.js runtime at version 22.19.0 or later, including newer major versions, without an upper major bound. An older runtime SHALL fail with status `1` and the single stderr line `a1 needs a newer Node.js: you have <runtime version>, install 22.19 or later`, where `<runtime version>` is the running Node.js version string, and SHALL NOT use the `installation failed:` prefix. The application and installer package manifests SHALL declare the same floor-only `engines.node` range `>=22.19.0`.

The installer SHALL retain only a bounded private child-diagnostic tail and classify common npm startup, network, registry, permission, integrity, activation, and launcher failures without replaying raw warning output, stack traces, progress fragments, credentials, request headers, or an unbounded npm transcript. Any temporary progress log SHALL be installer-owned and removed after success or after its bounded failure evidence has been consumed.

An explicit troubleshooting mode, `--verbose`, MAY append bounded terminal-safe diagnostics after failure and SHALL redact credentials and tokens. It SHALL NOT change the operation's verdict. Cancellation SHALL be unsuccessful with status `130`, SHALL terminate or contain owned children, SHALL restore terminal state, SHALL never report installation success, and SHALL use `installation cancelled` as its exact concise result. For interrupted fresh installation, the installer SHALL delete only its owned temporary evidence and SHALL permit retry without claiming rollback or deleting an uncertain npm-owned global tree.

#### Scenario: Global installation fails with noisy stderr
- **WHEN** npm writes warnings and an actionable error before exiting unsuccessfully
- **THEN** the default terminal SHALL receive one concise installer-owned failure line and no raw warning wall
- **AND** the installer SHALL return nonzero

#### Scenario: Troubleshooting is requested
- **WHEN** the same failure occurs under the explicit verbose mode
- **THEN** the installer MAY append a bounded sanitized diagnostic after the failure result
- **AND** SHALL redact credentials/tokens and preserve the same unsuccessful verdict

#### Scenario: The user cancels a fresh installation
- **WHEN** cancellation is received while npm may be mutating the first global installation
- **THEN** the installer SHALL terminate or await the child according to its safe signal boundary, clear progress, and report cancellation without success
- **AND** SHALL NOT recursively delete or claim rollback authority over an uncertain global package tree

#### Scenario: Rendering or execution is interrupted
- **WHEN** success, failure, signal cancellation, or an unexpected exception ends an interactive run
- **THEN** the cursor, foreground style, and progress row SHALL be restored exactly once
- **AND** no spinner worker, timer, or child-output log SHALL remain live

#### Scenario: The user retries after interruption
- **WHEN** a prior fresh installation ended unsuccessfully and no valid existing installation can be delegated to
- **THEN** a retry SHALL either converge through npm and complete all verification or fail truthfully without requiring deletion of A1 user data

#### Scenario: A newer Node.js major installs
- **WHEN** the installer runs on Node.js `v26.13.0` or another release at or above 22.19.0
- **THEN** the runtime check SHALL pass and installation SHALL proceed

#### Scenario: An outdated Node.js is detected
- **WHEN** the installer runs on Node.js `v20.11.0`
- **THEN** stderr SHALL receive exactly `a1 needs a newer Node.js: you have v20.11.0, install 22.19 or later`
- **AND** the installer SHALL return status `1` without starting npm work

#### Scenario: The repair option has no usable path
- **WHEN** `--repair` is repeated, has no value, or is followed by a path that is not absolute
- **THEN** stderr SHALL receive exactly `installation failed: --repair requires one absolute recovery capsule path`
- **AND** the installer SHALL return status `2` before any registry or installation work

#### Scenario: A removed option is supplied
- **WHEN** the user supplies `--version`, `--latest`, or `--next`
- **THEN** stderr SHALL receive exactly `installation failed: unsupported option` and the installer SHALL return status `2`

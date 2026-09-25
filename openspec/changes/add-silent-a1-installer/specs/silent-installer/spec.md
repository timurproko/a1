## ADDED Requirements

### Requirement: The official installer bootstrap is quiet before custom installation begins
The preferred stable installation command SHALL acquire and run `@timurproko/a1-installer@latest` through `npx` with non-interactive confirmation, error-level logging, funding output disabled, and audit output disabled. The installer package SHALL expose exactly one `a1-installer` executable, SHALL use only supported Node built-ins at runtime, and SHALL declare no production, optional, peer, or runtime-required development dependency and no npm installation lifecycle script.

The documented bootstrap SHALL preserve npm acquisition errors that occur before installer execution while suppressing bootstrap warnings, notices, funding text, audits, and confirmation prompts. The direct global npm installation command MAY remain documented as an explicit manual or recovery fallback but SHALL NOT be presented as the preferred quiet path after installer availability is accepted.

#### Scenario: A user starts the preferred installation
- **WHEN** the user runs `npx --yes --loglevel=error --no-fund --no-audit @timurproko/a1-installer@latest`
- **THEN** npm SHALL acquire the dependency-free installer without a confirmation prompt or warning/notice/funding/audit transcript
- **AND** the installer SHALL own subsequent terminal presentation

#### Scenario: Installer acquisition fails
- **WHEN** npm cannot acquire the installer package and its executable never starts
- **THEN** npm MAY emit the acquisition error selected by error-level logging
- **AND** no A1 success message SHALL appear

#### Scenario: The installer tarball is inspected
- **WHEN** the exact `@timurproko/a1-installer` artifact is unpacked
- **THEN** it SHALL contain exactly the declared installer executable and required metadata/assets
- **AND** its manifest SHALL contain no install lifecycle script or runtime dependency graph capable of producing transitive warning output

### Requirement: Successful installation shows only progress and one success message
In an interactive terminal, the installer SHALL display one carriage-return progress row conforming to A1 self-update's bar width, glyphs, completed/remaining colors, percentage treatment, and style reset. Progress SHALL be non-decreasing, SHALL use measured activation progress where available, and MAY creep toward but SHALL NOT render an unreached milestone during opaque npm work.

Every child process SHALL have stdout and stderr captured rather than inherit the terminal. Output from a successful child SHALL be discarded, including deprecation warnings, funding text, audit summaries, lifecycle-script policy warnings, package counts, and npm version notices. After all installation and verification work succeeds, the progress row SHALL be completed and removed or replaced, and stdout SHALL contain exactly `a1 successfully installed` followed by one newline with no phase text, version, path, count, warning, notice, or extra blank line.

When output is not interactive, the animated row SHALL be omitted and the same final success line SHALL remain.

#### Scenario: npm succeeds after writing warnings
- **WHEN** npm installs the exact target successfully while writing deprecation, funding, lifecycle-policy, package-count, or version notices
- **THEN** none of that child output SHALL reach the terminal
- **AND** the user SHALL observe one progress row followed by exactly `a1 successfully installed`

#### Scenario: npm work has no measured completion
- **WHEN** the global npm child remains active without reporting usable progress
- **THEN** the progress row MAY continue moving toward its next milestone
- **AND** SHALL remain visibly below that milestone until npm exits successfully

#### Scenario: Output is redirected
- **WHEN** the installer succeeds without an interactive output terminal
- **THEN** stdout SHALL contain exactly `a1 successfully installed` followed by one newline
- **AND** SHALL contain no carriage-return progress frames or ANSI styling

### Requirement: Installation resolves and verifies one exact target
The installer SHALL use the active npm executable and configuration to resolve the stable A1 channel, SHALL validate the authoritative `@timurproko/a1` identity and one exact semantic version, and SHALL pass that exact version rather than a moving tag to the global mutating command. It SHALL use cross-platform fixed argument arrays, SHALL NOT construct an interpolated shell command, and SHALL NOT persistently change npm configuration.

A fresh installation SHALL report success only after npm exits successfully, the canonical global package path identifies the exact target and expected package role, the complete platform launcher set targets that package, the installed tree's declared activation contract reports completion, and the exact release is active. A later ordinary launch SHALL not need to print installation or activation output.

#### Scenario: The stable channel is resolved
- **WHEN** active npm reports a valid latest A1 version
- **THEN** the installer SHALL globally install `@timurproko/a1@<that-exact-version>` with fixed arguments and captured streams
- **AND** SHALL NOT mutate npmrc or global/user npm settings

#### Scenario: npm exits zero but the target is incomplete
- **WHEN** package identity, version, role, launcher ownership, activation verdict, or active release does not match the resolved target
- **THEN** the installer SHALL fail without printing the success message

#### Scenario: Installation is complete
- **WHEN** package installation, launcher verification, immutable materialization, certification, warmup, supervision, and active-reference commit all succeed for the exact target
- **THEN** the installer SHALL print its exact success result
- **AND** the next `a1` invocation SHALL use the already active release without installation diagnostics

### Requirement: Existing installations retain cancellation-safe replacement
Before starting direct global installation, the installer SHALL distinguish an absent A1 package from a canonical valid existing installation. It MAY directly install only when no existing global A1 package owns the target location. When a valid supported A1 installation and complete launcher set already exist, the installer SHALL delegate replacement or current-version verification to that installation's cancellation-safe updater while capturing its streams behind the installer presentation.

A linked, foreign, malformed, partial, unsupported, mismatched, or ambiguously owned existing package or launcher set SHALL be refused before mutation. The installer SHALL NOT delete, rename, adopt, or directly overwrite such a tree.

#### Scenario: A1 is not installed
- **WHEN** the canonical active global root contains no A1 package or launcher ownership
- **THEN** the installer SHALL use its fresh global installation path

#### Scenario: A1 is already installed validly
- **WHEN** a supported canonical A1 package and complete launcher set are present
- **THEN** the installer SHALL use the installed cancellation-safe update path rather than an unguarded direct overwrite
- **AND** successful child output SHALL remain hidden behind the installer transcript

#### Scenario: Existing ownership is ambiguous
- **WHEN** the package path or launcher set is linked, foreign, partial, mismatched, unsupported, or cannot be verified
- **THEN** the installer SHALL fail before global mutation with no success text
- **AND** SHALL leave the observed package, launchers, processes, and A1 user data unchanged

### Requirement: Installation failures are concise and truthful
After installer execution begins, a failure SHALL clear the progress row, write no success text, return a nonzero status, and emit one default stderr line in the form `a1 installation failed: <concise reason>`. The installer SHALL retain bounded child diagnostics and classify common npm startup, network, registry, permission, integrity, activation, and launcher failures without replaying raw warning output, stack traces, progress fragments, credentials, request headers, or an unbounded npm transcript.

An explicit troubleshooting mode MAY append bounded terminal-safe diagnostics after failure and SHALL redact credentials and tokens. It SHALL NOT change the operation's verdict. Cancellation SHALL be unsuccessful, SHALL never report installation success, and MAY use `a1 installation cancelled` as its exact concise result. For interrupted fresh installation, the installer SHALL delete only its owned temporary evidence and SHALL permit retry without claiming rollback or deleting an uncertain npm-owned global tree.

#### Scenario: Global installation fails with noisy stderr
- **WHEN** npm writes warnings and an actionable error before exiting unsuccessfully
- **THEN** the default terminal SHALL receive one concise A1-owned failure line and no raw warning wall
- **AND** the installer SHALL return nonzero

#### Scenario: Troubleshooting is requested
- **WHEN** the same failure occurs under the explicit verbose mode
- **THEN** the installer MAY append a bounded sanitized diagnostic after the failure result
- **AND** SHALL redact credentials/tokens and preserve the same unsuccessful verdict

#### Scenario: The user cancels a fresh installation
- **WHEN** cancellation is received while npm may be mutating the first global installation
- **THEN** the installer SHALL terminate or await the child according to its safe signal boundary, clear progress, and report cancellation without success
- **AND** SHALL NOT recursively delete or claim rollback authority over an uncertain global package tree

#### Scenario: The user retries after interruption
- **WHEN** a prior fresh installation ended unsuccessfully and no valid existing installation can be delegated to
- **THEN** a retry SHALL either converge through npm and complete all verification or fail truthfully without requiring deletion of A1 user data

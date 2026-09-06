## MODIFIED Requirements

### Requirement: Update uses the authoritative npm release
The self-update workflow SHALL resolve the requested channel of `@timurproko/a1-runtime` from the configured npm registry and SHALL install it only when it differs from the active runtime. Ordinary runtime update MUST NOT replace the globally installed `@timurproko/a1` launcher package or its public launcher files. A1 MUST use cross-platform process execution with fixed argument arrays and MUST NOT construct an interpolated shell command string.

#### Scenario: A newer release is available
- **WHEN** npm reports a newer runtime version on the selected channel
- **THEN** A1 SHALL install, validate, and activate the exact `@timurproko/a1-runtime` release while leaving the public launcher unchanged

#### Scenario: The installed release is current
- **WHEN** npm reports a runtime version equal to the active verified release
- **THEN** A1 SHALL report that it is already current and exit successfully without reinstalling the runtime or launcher

#### Scenario: Runtime installation fails
- **WHEN** npm cannot install the selected runtime package
- **THEN** A1 SHALL retain the public launcher and prior verified runtime, report the failure, and remain callable

## ADDED Requirements

### Requirement: Combined-package installations migrate once without losing recovery
An installation in which `@timurproko/a1` still contains both launcher and runtime SHALL migrate through one durable transaction to the split launcher/runtime layout. Migration SHALL begin only from a cancellation-safe combined build, SHALL preserve the prior immutable release until the split layout is verified, and SHALL leave either the old combined command or the new stable launcher callable after every terminal outcome.

#### Scenario: Eligible combined installation updates
- **WHEN** a cancellation-safe combined A1 version selects the first split release
- **THEN** it SHALL install and verify the stable launcher and matching runtime before retiring mutable combined-package authority

#### Scenario: Migration is interrupted
- **WHEN** the process, terminal, package manager, or machine restarts during migration
- **THEN** the next `a1` invocation SHALL use preserved launcher or recovery authority to continue or roll back without manual package installation

#### Scenario: Unsupported old installation attempts direct migration
- **WHEN** an installation predating cancellation-safe update attempts to select the split release
- **THEN** A1 SHALL refuse the unsafe automatic migration and provide one exact supported bootstrap command

### Requirement: Runtime updates never mutate launcher ownership
Runtime installation, activation, rollback, and cleanup SHALL treat the launcher package and public launcher paths as protected external authority. Runtime operations SHALL NOT delete, rename, rewrite, or claim npm ownership of those paths.

#### Scenario: Runtime update succeeds
- **WHEN** a runtime target is installed and activated
- **THEN** filesystem evidence SHALL show that every public launcher retains its pre-update identity and content

#### Scenario: Runtime update is cancelled or crashes
- **WHEN** runtime replacement stops at any durable boundary
- **THEN** the unchanged launcher SHALL start the prior verified runtime or resume the transaction

## Purpose

Defines the permanent public A1 command bootstrap that remains independently callable while application runtime packages are installed, replaced, recovered, or rolled back.

## ADDED Requirements

### Requirement: The public launcher is independent from runtime replacement
The globally installed `@timurproko/a1` package SHALL exclusively own the public `a1` launcher set and SHALL remain executable while ordinary stable or development runtime updates replace `@timurproko/a1-runtime`. The launcher SHALL have no dependency on mutable runtime-package files for startup or recovery.

#### Scenario: Runtime update is interrupted
- **WHEN** runtime installation is cancelled, fails, is terminated, or is interrupted by restart
- **THEN** the existing public launcher SHALL remain callable and SHALL select the prior verified runtime or resume recovery

#### Scenario: Runtime package is missing or corrupt
- **WHEN** the selected mutable runtime package is absent, incomplete, or fails validation
- **THEN** the launcher SHALL start a compatible retained immutable release or report a bounded recovery diagnostic without replacing itself

#### Scenario: New installation completes
- **WHEN** a user globally installs `@timurproko/a1`
- **THEN** the installed launcher SHALL provision or select a compatible runtime and expose exactly the `a1` public command

### Requirement: Launcher and runtime negotiate compatibility
The launcher and runtime SHALL publish versioned compatibility metadata. Before executing selected runtime code, the launcher SHALL verify that their required protocol features overlap and SHALL reject a runtime that requires unsupported launcher behavior. Runtime selection SHALL prefer the requested verified target and otherwise retain or restore the newest compatible approved release.

#### Scenario: Runtime is compatible
- **WHEN** the selected runtime's required launcher features are supported
- **THEN** the launcher SHALL execute that exact verified runtime

#### Scenario: Runtime requires a newer launcher
- **WHEN** the selected runtime requires launcher features that are unavailable
- **THEN** the launcher SHALL leave the current compatible runtime selected and report the exact launcher upgrade required

#### Scenario: Launcher is newer than a retained runtime
- **WHEN** rollback selects a retained runtime whose required protocol remains supported
- **THEN** the launcher SHALL continue to launch it without rewriting the retained release

### Requirement: Launcher upgrades are explicit and recoverable
Ordinary `a1 update` SHALL NOT replace the public launcher package. A launcher replacement SHALL occur only through an explicit compatibility-driven launcher-upgrade transaction that preserves a verified previous launcher until the new launcher set is complete. Failure SHALL restore the previous launcher without changing the active runtime.

#### Scenario: Ordinary runtime update runs
- **WHEN** the selected runtime is compatible with the installed launcher
- **THEN** A1 SHALL update only runtime content and SHALL leave the launcher package and launcher files unchanged

#### Scenario: Launcher upgrade is required
- **WHEN** a requested runtime cannot run under the installed launcher
- **THEN** A1 SHALL explain and perform the separately authorized launcher upgrade before retrying runtime activation

#### Scenario: Launcher upgrade fails
- **WHEN** package replacement or launcher verification fails during an authorized launcher upgrade
- **THEN** A1 SHALL restore the previous verified launcher and retain the previously active compatible runtime

### Requirement: Uninstall behavior is explicit
Removing the public launcher package SHALL remove the public command while preserving user profiles, sessions, and retained runtime data unless the user separately requests data removal. Removing or corrupting only the runtime package SHALL NOT remove the public command.

#### Scenario: Public launcher is uninstalled
- **WHEN** npm successfully uninstalls `@timurproko/a1`
- **THEN** the public launcher set SHALL be removed and A1-owned user data SHALL remain untouched

#### Scenario: Runtime package is removed
- **WHEN** `@timurproko/a1-runtime` is absent but the launcher remains installed
- **THEN** `a1` SHALL remain callable and SHALL recover or launch a verified retained runtime

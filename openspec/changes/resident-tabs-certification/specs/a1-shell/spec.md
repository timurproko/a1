## MODIFIED Requirements

### Requirement: Help is explicit and unsupported commands are quiet
The installed application SHALL expose `a1 help` as the preferred complete-help command and SHALL retain equivalent `a1 --help` and `a1 -h` compatibility forms. Complete help and generated usage SHALL advertise only the direct `help`, `version`, `install`, `remove`, `uninstall`, `list`, `update`, and `tabs` forms and SHALL NOT include a compatibility-alias section or package forms under `a1 pi`. Explicit help on recognized direct or compatibility package commands SHALL print focused help for A1's supported subset without executing the command. Direct `a1 update --help` SHALL describe the supported stable, development, extension, model, and single-package update forms together. `a1 tabs --help` SHALL describe the resident-tab maintenance forms without probing or starting a resident server. A1 SHALL NOT append the complete application or command help to command failures; a focused syntax diagnostic MAY include pinned-style usage guidance for the affected supported command.

A word outside the supported command grammar SHALL be a silent successful no-op. It SHALL write nothing to stdout or stderr and SHALL NOT start an interactive runtime, supervisor, shell, update, package operation, or model refresh. A malformed invocation whose leading command is recognized MAY fail with one focused diagnostic and applicable usage guidance. A1-only update-selector errors SHALL retain their focused product-specific diagnostics.

#### Scenario: Help is requested
- **WHEN** the user runs `a1 help`, `a1 --help`, or `a1 -h`
- **THEN** A1 SHALL print the same direct-command list appropriate to that build and exit successfully without launching a runtime
- **AND** the list SHALL omit compatibility help/version flags and `a1 pi` package aliases

#### Scenario: Unknown top-level word is given
- **WHEN** the user runs `a1 sdjjhd`
- **THEN** A1 SHALL exit successfully with empty stdout and stderr and SHALL invoke no operation

#### Scenario: Unknown Pi operation is given
- **WHEN** the user runs `a1 pi sdjjhd`
- **THEN** A1 SHALL exit successfully with empty stdout and stderr and SHALL invoke no operation

#### Scenario: Recognized command is malformed
- **WHEN** the user gives conflicting options to `a1 update`
- **THEN** A1 SHALL fail before any operation with one concise diagnostic and without the complete help text

#### Scenario: Package command help is explicitly requested
- **WHEN** the user runs `a1 install --help`, `a1 remove -h`, `a1 uninstall --help`, `a1 list --help`, or `a1 update --help`
- **THEN** A1 SHALL print the respective supported command help and exit successfully without profile preparation, package/model work, self-update, or runtime launch
- **AND** help SHALL NOT advertise project-local packages, independent Pi updates, or other unsupported operations or options

#### Scenario: Compatibility package command help is explicitly requested
- **WHEN** the user requests help from a supported `a1 pi` package command
- **THEN** A1 SHALL retain focused compatibility help without profile preparation, package/model work, or runtime launch

#### Scenario: Focused package syntax guidance is needed
- **WHEN** a recognized direct or compatibility package command has a missing source, unexpected argument, or genuinely unknown option
- **THEN** A1 SHALL emit its pinned-style diagnostic and focused usage guidance for the invoked namespace rather than the complete command help

#### Scenario: Resident-tab maintenance help is requested
- **WHEN** the user runs `a1 tabs --help`
- **THEN** A1 SHALL print the `a1 tabs` maintenance forms and exit successfully without probing or starting a resident server, profile preparation, or runtime launch

#### Scenario: Resident-tab maintenance command is malformed
- **WHEN** the user runs `a1 tabs` with an unknown subcommand or option
- **THEN** A1 SHALL fail with one concise diagnostic and a nonzero status, without the complete help text and without contacting a resident server

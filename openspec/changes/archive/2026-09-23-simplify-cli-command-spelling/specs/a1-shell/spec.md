## MODIFIED Requirements

### Requirement: Version output follows the Pi command convention
The installed application SHALL expose `a1 version` as the preferred version command and SHALL retain equivalent `a1 --version` and `a1 -v` compatibility forms. None of those forms SHALL start or mutate the interactive runtime, supervisor, storage, release cohort, or update transaction. A stable release SHALL print only its installed exact semantic version without remote discovery. A development build SHALL report `Current`, `Develop`, and `Release` in that order and SHALL discover authoritative package dist-tags as one coherent result; an absent development tag SHALL be unavailable without a diagnostic, while discovery failure SHALL make both remote fields unavailable with one concise `A1` diagnostic.

#### Scenario: Stable release version
- **WHEN** the user runs `a1 version`, `a1 --version`, or `a1 -v` from a stable release
- **THEN** A1 SHALL print only the installed exact semantic version without querying remote channels

#### Scenario: Development build versions
- **WHEN** the user runs `a1 version`, `a1 --version`, or `a1 -v` from a development build
- **THEN** every form SHALL display the same `Current`, `Develop`, and `Release` result in order, applying the declared unavailable behavior when remote channel metadata is absent or unreachable

#### Scenario: Old subcommand notation
- **WHEN** the user runs the formerly unsupported `a1 version` notation
- **THEN** A1 SHALL now treat it as the preferred equivalent of `a1 --version` and `a1 -v`

### Requirement: Help is explicit and unsupported commands are quiet
The installed application SHALL expose `a1 help` as the preferred complete-help command and SHALL retain equivalent `a1 --help` and `a1 -h` compatibility forms. Complete help and generated usage SHALL advertise only the direct `help`, `version`, `install`, `remove`, `uninstall`, `list`, and `update` forms and SHALL NOT include a compatibility-alias section or package forms under `a1 pi`. Explicit help on recognized direct or compatibility package commands SHALL print focused help for A1's supported subset without executing the command. Direct `a1 update --help` SHALL describe the supported stable, development, extension, model, and single-package update forms together. A1 SHALL NOT append the complete application or command help to command failures; a focused syntax diagnostic MAY include pinned-style usage guidance for the affected supported command.

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

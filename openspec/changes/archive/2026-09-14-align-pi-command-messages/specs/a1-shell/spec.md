## MODIFIED Requirements

### Requirement: Help is explicit and unsupported commands are quiet
The installed application SHALL expose equivalent `a1 --help` and `a1 -h` forms that print the complete commands supported by that build and exit successfully. Explicit `--help` and `-h` on recognized `a1 pi install`, `remove`, `uninstall`, `list`, and `update` commands SHALL print focused command help for A1's supported subset without executing the command. A1 SHALL NOT append the complete application or command help to command failures; a focused syntax diagnostic MAY include pinned-style usage guidance for the affected supported command.

A word outside the supported command grammar SHALL be a silent successful no-op. It SHALL write nothing to stdout or stderr and SHALL NOT start an interactive runtime, supervisor, shell, update, package operation, or model refresh. A malformed invocation whose leading command is recognized MAY fail with one focused diagnostic and applicable usage guidance. A1-only update-selector errors SHALL retain their focused product-specific diagnostics.

#### Scenario: Help is requested
- **WHEN** the user runs `a1 --help` or `a1 -h`
- **THEN** A1 SHALL print the command list appropriate to that build and exit successfully without launching a runtime

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
- **WHEN** the user runs `a1 pi install --help`, `a1 pi remove -h`, `a1 pi uninstall --help`, `a1 pi list --help`, or `a1 pi update --help`
- **THEN** A1 SHALL print the respective supported command help and exit successfully without profile preparation, package/model work, or runtime launch
- **AND** help SHALL NOT advertise project-local packages, independent Pi updates, or other unsupported operations or options

#### Scenario: Focused package syntax guidance is needed
- **WHEN** a recognized Pi-compatible package command has a missing source, unexpected argument, or genuinely unknown option
- **THEN** A1 SHALL emit its pinned-style diagnostic and focused usage guidance rather than the complete command help

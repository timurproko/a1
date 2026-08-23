## MODIFIED Requirements

### Requirement: Maintenance commands remain unambiguous
`version`, `update`, `update:next`, `install`, `remove`, `uninstall`, and `list`
SHALL retain their existing non-interactive meanings, SHALL NOT be interpreted as Pi
profile names, and SHALL NOT be forwarded to Pi as launch arguments. Unknown A1
subcommands SHALL fail before supervisor or foreground-child startup.

The colon suffix SHALL continue to select which A1 release a self-update takes, as
in `update:next`, and SHALL NOT be used to select what an operation acts on. What an
operation acts on SHALL be given as a flag or a positional source, as in
`update --extensions`, so one separator never carries two meanings.

#### Scenario: Query version
- **WHEN** the user runs `a1 version`
- **THEN** A1 SHALL execute the dependency-light version query without launching any interactive profile

#### Scenario: Manage packages
- **WHEN** the user runs `a1 install`, `a1 remove`, `a1 uninstall`, or `a1 list`
- **THEN** A1 SHALL run the package operation against the A1 profile without launching any interactive profile

#### Scenario: Unknown subcommand
- **WHEN** the user provides a subcommand other than `pi`, `sandbox`, `version`, `update`, `update:next`, `install`, `remove`, `uninstall`, or `list`
- **THEN** A1 SHALL exit with a usage error without invoking a shell or child Pi process

#### Scenario: Launch form is given an argument
- **WHEN** the user runs `a1 pi` or `a1 sandbox` with any further argument
- **THEN** A1 SHALL exit with a usage error, because launch forms take no arguments and package commands take no profile

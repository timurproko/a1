## MODIFIED Requirements

### Requirement: Maintenance commands remain unambiguous
`version`, `update`, and `update:next` SHALL retain their existing non-interactive
meanings. `pi install`, `pi remove`, `pi uninstall`, `pi list`, and `pi update`
SHALL be non-interactive package forms rather than Pi profile launch arguments. Unknown A1
subcommands SHALL fail before supervisor or foreground-child startup.

The colon suffix SHALL continue to select which A1 release a self-update takes, as
in `update:next`, and SHALL NOT be used to select what an operation acts on. What an
operation acts on SHALL be given as a flag or a positional source, as in
`pi update --extensions`, so one separator never carries two meanings.

#### Scenario: Query version
- **WHEN** the user runs `a1 version`
- **THEN** A1 SHALL execute the dependency-light version query without launching any interactive profile

#### Scenario: Manage packages
- **WHEN** the user runs `a1 pi install`, `a1 pi remove`, `a1 pi uninstall`, or `a1 pi list`
- **THEN** A1 SHALL run the package operation against the A1 profile without launching any interactive profile

#### Scenario: Unknown subcommand
- **WHEN** the user provides an unsupported top-level command or an unsupported operation under `a1 pi`
- **THEN** A1 SHALL exit with a usage error without invoking a shell or child Pi process

#### Scenario: Launch form is given an argument
- **THEN** A1 SHALL exit with a usage error without launching a profile

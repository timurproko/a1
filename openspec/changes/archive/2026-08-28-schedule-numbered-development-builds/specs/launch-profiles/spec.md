## MODIFIED Requirements

### Requirement: Maintenance commands remain unambiguous
`version`, `update`, `update:develop`, and `update:<number>` SHALL retain their
non-interactive meanings and SHALL NOT be interpreted as Pi profile names or
forwarded to Pi. Unknown A1 subcommands, including the removed `update:next`
spelling, SHALL fail before supervisor or foreground-child startup.

#### Scenario: Query version
- **WHEN** the user runs `a1 --version`
- **THEN** A1 SHALL execute the dependency-light version query without launching any interactive profile

#### Scenario: Unknown subcommand
- **WHEN** the user provides a subcommand other than `pi`, `version`, `update`, `update:develop`, or a valid numbered/full-version preview update
- **THEN** A1 SHALL exit with a usage error without invoking a shell or child Pi process

#### Scenario: Removed development spelling
- **WHEN** the user runs `a1 update:next`
- **THEN** A1 SHALL direct the user to `a1 update:develop` without starting an interactive profile

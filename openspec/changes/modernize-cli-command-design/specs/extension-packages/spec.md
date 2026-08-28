## MODIFIED Requirements

### Requirement: Package commands manage the A1 profile only
`a1 pi install <source>`, `a1 pi remove <source>`, its alias
`a1 pi uninstall <source>`, `a1 pi list`, and accepted `a1 pi update` package forms
SHALL operate on A1's own profile. `a1 pi update --models` SHALL refresh model
catalogs in that same profile. It SHALL be an alias for `a1 update --models`, not a
Pi self-update or package update.

Project-local package mutation and `a1 pi config` are reserved for a separate trust
and configuration design and SHALL NOT be advertised as supported by this change.

#### Scenario: Install an npm package
- **WHEN** the user runs `a1 pi install npm:pi-mcp-adapter`
- **THEN** A1 SHALL install the package beneath `<home>/.a1/agent` and add its source to that profile's settings
- **AND** the next bare `a1` SHALL load the extension the package provides

#### Scenario: Remove an installed package
- **WHEN** the user runs `a1 pi remove npm:pi-mcp-adapter` or `a1 pi uninstall npm:pi-mcp-adapter`
- **THEN** A1 SHALL remove the installed content and the settings entry from the A1 profile
- **AND** both spellings SHALL behave identically

#### Scenario: List installed packages
- **WHEN** the user runs `a1 pi list`
- **THEN** A1 SHALL report the packages configured in the A1 profile with where each is installed
- **AND** SHALL say plainly that none are installed rather than printing nothing

#### Scenario: A profile is named
- **WHEN** the user supplies a profile flag or project-local scope to a package command
- **THEN** A1 SHALL fail before package work and explain that package commands manage the A1 profile only

#### Scenario: Refresh model catalogs through the Pi namespace
- **WHEN** the user runs `a1 pi update --models`
- **THEN** A1 SHALL refresh the model catalogs under the A1 profile without updating packages, A1, or Pi

### Requirement: Pinned Pi cannot be updated independently
A1 SHALL reject recognized Pi self-update forms because the Pi runtime is pinned to
the certified A1 release. The focused failure SHALL name the supported A1,
extension, and model update commands and SHALL NOT append the complete help.

#### Scenario: Bare Pi update is requested
- **WHEN** the user runs `a1 pi update`
- **THEN** A1 SHALL fail before update work and explain that Pi is pinned

#### Scenario: Explicit Pi self-update is requested
- **WHEN** the user runs `a1 pi update --self`, `a1 pi update pi`, or `a1 pi update --all`
- **THEN** A1 SHALL fail before update work and name `a1 update`, `a1 pi update --extensions`, and `a1 pi update --models` as supported alternatives

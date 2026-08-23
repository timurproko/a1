## MODIFIED Requirements

### Requirement: A1 exposes exactly three interactive launch forms
The `a1` binary SHALL be the sole installed public command. Bare invocation SHALL be
the A1 agent product surface and initially launch the normal single-foreground A1
profile, the `pi` subcommand SHALL present pinned Pi's interface through A1's own
rendering and input with none of A1's own surfaces, and the `sandbox` subcommand
SHALL launch the isolated sandbox profile as vanilla Pi. A1 SHALL NOT install an
`addone` executable or expose an `agent` subcommand alias; future multi-agent UX
SHALL evolve bare invocation.

The `pi` and `sandbox` subcommands are development instruments, so only a
prerelease build SHALL expose them. A release build SHALL expose bare invocation
and the non-interactive commands alone, SHALL NOT name `pi` or `sandbox` in usage,
and SHALL treat them as unknown subcommands. Which build is running SHALL be
determined from that build's own version, and SHALL NOT be reachable through an
environment variable, setting, or flag, so a release build cannot be induced to
expose them.

Repository development SHALL NOT depend on the command line for these profiles:
the development launcher prepares the selected profile and launches directly, so a
checkout keeps both profiles whatever version it carries.

`a1 pi` SHALL be what rendering parity compares against pinned Pi, so what is
measured is a command anyone can run rather than a mode that exists only while it is
being measured. It SHALL use the same composition bare A1 uses, with A1's own
surfaces withheld rather than a separate implementation of it.

#### Scenario: Launch normal A1
- **WHEN** the user runs `a1` without a subcommand
- **THEN** A1 SHALL launch one transparent full-viewport Pi process using the normal A1 profile
- **AND** it SHALL do so in a release build and in a prerelease build alike

#### Scenario: Launch vanilla Pi baseline
- **WHEN** the user runs `a1 pi` in a prerelease build
- **THEN** A1 SHALL present pinned Pi's interface through its own rendering and input, using Pi's ordinary user profile
- **AND** no A1-owned surface SHALL be reachable from it

#### Scenario: Launch sandbox profile
- **WHEN** the user runs `a1 sandbox` in a prerelease build
- **THEN** A1 SHALL launch one transparent full-viewport Pi process using the isolated A1 sandbox profile

#### Scenario: Development profile is requested from a release build
- **WHEN** the user runs `a1 pi` or `a1 sandbox` in a release build
- **THEN** A1 SHALL reject it as an unknown subcommand and display usage that names neither
- **AND** SHALL NOT launch a profile, start a supervisor, or read another profile root

#### Scenario: Development launcher is used in a checkout
- **WHEN** a contributor runs the repository's development launch for the `pi` or `sandbox` profile
- **THEN** the profile SHALL launch regardless of the version the checkout carries

#### Scenario: Removed full-name executable is inspected
- **WHEN** npm installs the official A1 package
- **THEN** the installation SHALL NOT create an `addone` executable

#### Scenario: Agent alias is requested
- **WHEN** the user runs `a1 agent`
- **THEN** A1 SHALL reject the unknown subcommand, explain that bare `a1` is the agent experience, and display concise usage without launching Pi

#### Scenario: Multi-agent UX is introduced later
- **WHEN** a separately approved multi-agent change replaces the initial single-foreground A1 presentation
- **THEN** bare `a1` SHALL remain the entry point and `a1 pi` plus `a1 sandbox` SHALL retain their explicit meanings where they are exposed

### Requirement: Maintenance commands remain unambiguous
`version`, `update`, `update:next`, `install`, `remove`, `uninstall`, and `list`
SHALL retain their existing non-interactive meanings, SHALL NOT be interpreted as Pi
profile names, and SHALL NOT be forwarded to Pi as launch arguments. A subcommand
this build does not expose SHALL fail before supervisor or foreground-child startup.

The colon suffix SHALL continue to select which A1 release a self-update takes, as
in `update:next`, and SHALL NOT be used to select what an operation acts on. What an
operation acts on SHALL be given as a flag or a positional source, as in
`update --extensions`, so one separator never carries two meanings. A bare release
channel word SHALL NOT be taken as a package source: `update next` and
`update stable` SHALL name the colon form rather than search for a package.

#### Scenario: Query version
- **WHEN** the user runs `a1 version`
- **THEN** A1 SHALL execute the dependency-light version query without launching any interactive profile

#### Scenario: Manage packages
- **WHEN** the user runs `a1 install`, `a1 remove`, `a1 uninstall`, or `a1 list`
- **THEN** A1 SHALL run the package operation against the A1 profile without launching any interactive profile
- **AND** it SHALL do so in a release build and in a prerelease build alike

#### Scenario: Unknown subcommand
- **WHEN** the user provides a subcommand this build does not expose
- **THEN** A1 SHALL exit with a usage error without invoking a shell or child Pi process

#### Scenario: Channel word is given to update
- **WHEN** the user runs `a1 update next` or `a1 update stable`
- **THEN** A1 SHALL explain that a channel is selected with the colon and name the command that does it, rather than reporting a missing package

#### Scenario: Launch form is given an argument
- **WHEN** the user runs an exposed launch form with any further argument
- **THEN** A1 SHALL exit with a usage error, because launch forms take no arguments and package commands take no profile

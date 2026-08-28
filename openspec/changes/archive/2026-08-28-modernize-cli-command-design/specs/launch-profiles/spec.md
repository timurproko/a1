## MODIFIED Requirements

### Requirement: Maintenance commands remain unambiguous
`--help`, `-h`, `--version`, `-v`, `update`, and the declared operations under
`a1 pi` SHALL retain their maintenance meanings and SHALL NOT be interpreted as
profile names or forwarded into an interactive runtime. `a1 update --develop` MAY
carry one numbered or full-version preview selector. A prerelease build SHALL expose
bare `a1 pi` as its comparison launch; a release build SHALL treat that launch form
as unsupported.

An unsupported command or operation SHALL exit successfully without output before
supervisor, foreground-child, shell, or operation startup. A malformed invocation
of a recognized maintenance command SHALL fail before startup with focused command
guidance and without automatically printing the complete help.

#### Scenario: Query help
- **WHEN** the user runs `a1 --help` or `a1 -h`
- **THEN** A1 SHALL print help without launching any profile

#### Scenario: Query version
- **WHEN** the user runs `a1 --version` or `a1 -v`
- **THEN** A1 SHALL execute the dependency-light version query without launching any profile

#### Scenario: Manage packages
- **WHEN** the user runs `a1 pi install`, `a1 pi remove`, `a1 pi uninstall`, `a1 pi list`, or an accepted package update form
- **THEN** A1 SHALL run the package operation against the A1 profile without launching any interactive profile

#### Scenario: Launch form is given an argument
- **WHEN** an interactive launch form is followed by an argument outside the declared maintenance grammar
- **THEN** A1 SHALL return successfully and silently without launching a profile

#### Scenario: Unknown subcommand
- **WHEN** the user provides a word outside the declared grammar
- **THEN** A1 SHALL return successfully and silently without invoking a shell or child process

#### Scenario: Comparison launch is absent from a release
- **WHEN** the user runs bare `a1 pi` from a stable release build
- **THEN** A1 SHALL return successfully and silently without launching a profile

#### Scenario: Removed update command is provided
- **WHEN** the user provides a command beginning `update:`
- **THEN** A1 SHALL return successfully and silently without update or runtime work

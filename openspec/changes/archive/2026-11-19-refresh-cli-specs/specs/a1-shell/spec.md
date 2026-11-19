## MODIFIED Requirements

### Requirement: Every package update is one immediate replacement command
The installed application SHALL expose `a1 update` as the update command for the
channel of the running release: npm tag `latest` for a stable build and the npm
development dist-tag `next` for a `-dev.N` build. `a1 update --release` SHALL
select `latest` from either channel and `a1 update --develop` SHALL select `next`.
A positive preview number or full numbered preview version MAY follow `--develop`
to select one immutable publication; the preview number is the pull request number
recorded in a published preview's manifest, or the trailing number of a
`<version>-dev.<number>` preview. Invocation SHALL authorize the ownership-safe
replacement transaction and return to the invoking shell after reporting its final
result.

The application SHALL NOT accept any `update:<selector>` command or `a1 update self`.
Each SHALL exit with status 2 and one diagnostic on stderr and SHALL NOT resolve the
registry, start the interactive runtime, or install anything.

#### Scenario: Replace the current preview
- **WHEN** the user runs `a1 update --develop` while an older verified A1 release is active
- **THEN** A1 SHALL perform the replacement transaction using the exact version selected by the development dist-tag and return to the terminal prompt

#### Scenario: Selected channel is current
- **WHEN** the selected npm tag resolves to the exact active A1 release version
- **THEN** A1 SHALL report that it is up to date without reinstalling it

#### Scenario: Ownership cannot be verified
- **WHEN** A1 cannot prove that the update lease, transaction, or immutable release store belongs to the expected installation
- **THEN** the update SHALL fail safely without terminating any process or deleting release or update state

#### Scenario: Update is interrupted
- **WHEN** an update is interrupted after a durable transaction phase
- **THEN** the next invocation SHALL continue or roll back to one verified active release without manual cleanup

#### Scenario: Another target was interrupted by a process that is gone
- **WHEN** the user runs `a1 update --develop 828` while the update lease names a process that is no longer alive and the durable transaction targets `0.2.7-dev.835`
- **THEN** A1 SHALL roll that transaction back to its prior verified release, say that the interrupted `0.2.7-dev.835` update was rolled back, and install preview 828 in the same invocation

#### Scenario: Launch after a completed update
- **WHEN** the user runs bare `a1` after the update command reported success
- **THEN** A1 SHALL launch the already active target without printing installation or activation messages

#### Scenario: Replace with a numbered preview
- **WHEN** the user runs `a1 update --develop 828` and exactly one published preview records pull request 828 or ends in `-dev.828`
- **THEN** A1 SHALL install that exact immutable preview

#### Scenario: Replace with an exact preview
- **WHEN** the user runs `a1 update --develop 0.2.7-dev.1218` and that preview is published
- **THEN** A1 SHALL install exactly `0.2.7-dev.1218`

#### Scenario: Removed update notation is used
- **WHEN** the user runs `a1 update:develop`, `a1 update:107`, `a1 update:0.1.8-dev.107`, or `a1 update self`
- **THEN** A1 SHALL exit with status 2 after printing one diagnostic to stderr, with empty stdout and no registry, package, or runtime work

### Requirement: Package identity is authoritative throughout release handling
Version discovery, self-update, installed metadata lookup, immutable release derivation, and update recovery SHALL use `@timurproko/a1`, taken from the single product identity authority, as the sole accepted package identity. A release manifest or recovery capsule naming any other package SHALL be rejected.

#### Scenario: Materialize the new package
- **WHEN** A1 reads or validates an immutable release manifest or an update recovery capsule
- **THEN** it SHALL accept `@timurproko/a1` metadata and SHALL reject any other package name as invalid

#### Scenario: Query release channels
- **WHEN** `a1 version`, `a1 update`, or `a1 update --develop` resolves npm metadata
- **THEN** every registry query and installation target SHALL reference `@timurproko/a1`

### Requirement: Interactive launch forms use the owned Pi UI pipeline directly
Bare `a1` SHALL launch the A1-owned single-agent UI directly, and `a1 --session <path|id>` SHALL resume the selected session in that same UI. Prerelease `a1 pi` SHALL use the same owned rendering and input pipeline with A1 surfaces withheld and Pi's ordinary profile selected. No launch form SHALL present a tab strip, start a resident host or bridge, run more than one agent, or introduce a PTY, terminal parser, or byte relay. The words `agent`, `solo`, `tabs`, and `ui` SHALL be reserved: as the first argument each SHALL be rejected with status 2 and one diagnostic rather than launched or treated as a prompt.

#### Scenario: Launch bare A1
- **WHEN** the user runs `a1`
- **THEN** A1 SHALL start one fresh direct single-agent owned UI without a tab strip, resident host, or profile argument

#### Scenario: Resume a session
- **WHEN** the user runs a supported `a1 --session <path|id>` form
- **THEN** A1 SHALL start the same direct single-agent owned UI for the selected saved session

#### Scenario: Launch after a prior exit
- **WHEN** the user runs bare `a1` after a previous session exited
- **THEN** A1 SHALL start a fresh session and SHALL NOT look for, reattach to, or restore earlier running agents

#### Scenario: Launch the Pi comparison
- **WHEN** the user runs prerelease `a1 pi`
- **THEN** A1 SHALL use the shared owned pipeline with product surfaces withheld and Pi's ordinary profile selected

#### Scenario: Removed words are given
- **WHEN** the user runs `a1 solo`, `a1 tabs`, `a1 ui`, or `a1 agent`
- **THEN** A1 SHALL exit with status 2 after one stderr diagnostic that names `--` as the way to pass a literal instruction, and SHALL select no runtime

#### Scenario: Two launches select one session
- **WHEN** two A1 processes select the same canonical session file
- **THEN** the shared session-writer guard, implemented without native code, SHALL admit one writer and apply the session-resume conflict behavior to the other

## REMOVED Requirements

### Requirement: Version output follows the Pi command convention
**Reason**: One scenario described the history of the `a1 version` spelling instead of behavior, and the requirement did not state the offline and unreadable-manifest outcomes the command has.
**Migration**: Replaced by "Version output reports the installed version and both channel heads".

### Requirement: Official npm distribution has one fresh package identity
**Reason**: It specified the finished first publication of `0.1.0` and a registry deprecation procedure, which are completed one-time actions rather than product behavior.
**Migration**: The lasting part is stated by "The package declares one public executable"; package-name authority stays in "Package identity is authoritative throughout release handling".

### Requirement: Help advertises the single-agent grammar and unsupported commands are quiet
**Reason**: The code does not treat an unknown word as a silent no-op: an unreserved word is a prompt for a normal launch and a reserved word exits with status 2. The help list was also narrower than the printed help.
**Migration**: Replaced by "Help lists the command grammar and unrecognized input has defined outcomes".

### Requirement: Installed interactive startup is measurable and bounded across update, restart, and warm launches
**Reason**: Its 5-second and 3-second budgets are superseded by the 2-second and 2.5-second budgets in "Interactive startup evaluates a bounded single-process readiness graph", which the startup budget code implements.
**Migration**: Budgets are owned by "Interactive startup evaluates a bounded single-process readiness graph"; tracing is stated by "Startup timing is traced only on request".

## ADDED Requirements

### Requirement: Version output reports the installed version and both channel heads
`a1 version`, `a1 --version`, and `a1 -v` SHALL be equivalent, SHALL print `Current`, `Develop`, and `Release` lines in that order from stable and development builds alike, and SHALL NOT start or mutate the interactive runtime, release store, active release, or update transaction. `Current` SHALL be the version in the installed package manifest. `Release` and `Develop` SHALL be the `latest` and `next` npm dist-tags of the product package, read through npm and, when that fails, directly from the registry. An absent `next` tag SHALL print `Develop: unavailable` without a diagnostic. When neither source yields valid dist-tags, both remote lines SHALL print `unavailable`, one `A1` diagnostic SHALL go to stderr, and the command SHALL still exit 0. When `PI_OFFLINE` is truthy the command SHALL query nothing and print both remote lines as `unavailable` without a diagnostic. Any argument after the version word SHALL fail with status 2.

A development build SHALL append ` (#<number>)` to its `Current` line when its installed manifest records a positive `publication.pullRequest`. Every build SHALL append the same form to the `Develop` line when the development head's published manifest records one. A missing or unreadable record SHALL leave the bare version without a diagnostic. A stable `Current` line and the `Release` line SHALL NOT carry a pull request. An installed manifest that cannot be read or holds no valid semantic version SHALL fail with status 1 and one diagnostic.

#### Scenario: Stable release version
- **WHEN** the user runs `a1 version`, `a1 --version`, or `a1 -v` from stable release `0.3.0`, the `next` dist-tag is `0.4.0-dev.123` recording pull request 123, and the `latest` dist-tag is `0.3.1`
- **THEN** every form SHALL print `Current: 0.3.0`, `Develop: 0.4.0-dev.123 (#123)`, and `Release: 0.3.1` in that order and exit 0

#### Scenario: Registry discovery fails
- **WHEN** neither npm nor the registry returns valid dist-tags
- **THEN** A1 SHALL print `Current: <installed version>`, `Develop: unavailable`, and `Release: unavailable`, emit one `A1` diagnostic on stderr, and exit 0

#### Scenario: Development tag is absent
- **WHEN** discovery returns a valid `latest` dist-tag but no `next` dist-tag
- **THEN** A1 SHALL print its `Current` line, `Develop: unavailable`, and the resolved `Release` line without a diagnostic

#### Scenario: Development build with recorded pull requests
- **WHEN** the user runs `a1 version` from `0.2.7-dev.1217` whose manifest records pull request 842 and the `next` dist-tag is `0.2.7-dev.1218` whose manifest records pull request 828
- **THEN** A1 SHALL print `Current: 0.2.7-dev.1217 (#842)`, `Develop: 0.2.7-dev.1218 (#828)`, and the `Release` line

#### Scenario: No pull request is recorded
- **WHEN** the installed development manifest or the development head manifest records no pull request, or the head manifest cannot be read
- **THEN** that line SHALL print the bare version and A1 SHALL emit no diagnostic for the missing record

#### Scenario: Offline mode is set
- **WHEN** the user runs `a1 version` with `PI_OFFLINE=1`
- **THEN** A1 SHALL print the `Current` line and both remote lines as `unavailable` without contacting npm and without a diagnostic

### Requirement: The package declares one public executable
The npm package SHALL be named `@timurproko/a1` and its manifest `bin` map SHALL contain exactly the `a1` executable pointing at the CLI entry named by the product identity authority. Other process entry files MAY ship in the package payload but SHALL NOT be registered as npm executables.

#### Scenario: Inspect package metadata
- **WHEN** the package manifest and lockfile are checked against the product identity authority
- **THEN** both SHALL name `@timurproko/a1` and declare exactly one executable, `a1`
- **AND** a different name or an additional executable SHALL fail the product-identity boundary check

### Requirement: Help lists the command grammar and unrecognized input has defined outcomes
`a1 help`, `a1 --help`, and `a1 -h` SHALL be equivalent, SHALL print the same command list to stdout, and SHALL exit 0 without launching a runtime. The list SHALL cover the bare launch, `--session`, `--session-color`, `--session-dir`, `help`, `version`, the interactive launch options, the `update` forms, `install`, `remove`, both `uninstall` forms, `list`, the `worktree` forms, the `api` form, and the `session` context aliases. It SHALL list `a1 pi` only in a prerelease build and SHALL NOT list `solo`, `tabs`, or `a1 pi` package forms. An argument after a help or version word SHALL fail with status 2.

A first argument that is not a command word SHALL NOT be a no-op. An unreserved word SHALL be the first positional instruction of a normal launch. The reserved words `agent`, `solo`, `ui`, `tabs`, and any `update:<selector>` SHALL exit with status 2 and one diagnostic. `config`, `auth`, and `mcp` SHALL exit with status 2 and a diagnostic saying the command is not available. An unrecognized operation after `a1 pi`, and `a1 pi` itself in a stable build, SHALL exit 0 with empty stdout and stderr and invoke nothing. A malformed recognized command SHALL fail with status 2 and one focused diagnostic, never the complete help.

#### Scenario: Help is requested
- **WHEN** the user runs `a1 help`, `a1 --help`, or `a1 -h`
- **THEN** A1 SHALL print the same command list for that build and exit 0 without launching a runtime
- **AND** the list SHALL include `a1 pi` only when the build is a prerelease

#### Scenario: An unreserved word is given
- **WHEN** the user runs `a1 sdjjhd`
- **THEN** A1 SHALL start a normal launch with `sdjjhd` as its instruction

#### Scenario: A reserved word is given
- **WHEN** the user runs `a1 solo`, `a1 tabs`, or `a1 update:next`
- **THEN** A1 SHALL exit with status 2 after one stderr diagnostic and SHALL invoke no operation

#### Scenario: Unknown Pi operation is given
- **WHEN** the user runs `a1 pi sdjjhd`
- **THEN** A1 SHALL exit 0 with empty stdout and stderr and SHALL invoke no operation

#### Scenario: Recognized command is malformed
- **WHEN** the user gives conflicting options to `a1 update`
- **THEN** A1 SHALL fail with status 2 before any operation with one diagnostic and without the complete help text

#### Scenario: Package command help is explicitly requested
- **WHEN** the user runs `a1 install --help`, `a1 remove -h`, `a1 uninstall --help`, `a1 list --help`, or `a1 update --help`
- **THEN** A1 SHALL print that command's help and exit 0 without profile preparation, package or model work, self-update, or runtime launch
- **AND** `a1 update --help` SHALL list the current-channel, release, development, model, extension, and single-package forms together

#### Scenario: Compatibility package command help is explicitly requested
- **WHEN** the user requests help from a supported `a1 pi` package command
- **THEN** A1 SHALL print help that names the `a1 pi` forms, without profile preparation, package or model work, or runtime launch

#### Scenario: Focused package syntax guidance is needed
- **WHEN** a recognized direct or `a1 pi` package command has a missing source, unexpected argument, or unknown option
- **THEN** A1 SHALL exit with status 2 after a diagnostic and usage line for the invoked namespace rather than the complete command help

### Requirement: Startup timing is traced only on request
A1 SHALL record startup timing only when `A1_STARTUP_TRACE` names an evidence file. It SHALL then append one event per reached phase among `command-invoked`, `bootstrap-start`, `bootstrap-selected`, `durable-validation-start`, `durable-validation-complete`, `ui-entry`, `ui-modules-loaded`, `pi-services`, `resource-discovery`, `session-created`, `settings-loaded`, and `first-input-ready-render`. Each event SHALL carry the trace identity, phase, elapsed milliseconds since command invocation, process, profile, release and dependency-layer identifiers, Node version, and a file-read count, and SHALL carry no credential, prompt, or session content. Without the variable a launch SHALL perform no trace I/O and print no timing detail.

#### Scenario: Startup tracing is enabled
- **WHEN** a launch runs with `A1_STARTUP_TRACE` set to a file path
- **THEN** A1 SHALL append a phase event for each phase it reaches, ending with `first-input-ready-render` once the editor accepts input

#### Scenario: Startup tracing is not enabled
- **WHEN** the user performs an ordinary interactive launch
- **THEN** A1 SHALL write no trace file and SHALL print no startup timing detail or loading transcript

## ADDED Requirements

### Requirement: Interactive launch forms use the owned Pi UI pipeline directly
Bare `a1` SHALL launch the A1-owned single-agent UI directly, and `a1 --session <path|id>` SHALL resume the selected session in that same UI. Prerelease `a1 pi` SHALL use the same owned rendering and input pipeline with A1 surfaces withheld and Pi's ordinary profile selected. No launch form SHALL present a tab strip, start a resident host or bridge, run more than one agent, or introduce a PTY, terminal parser, or byte relay. The `solo`, `tabs`, and `ui` words SHALL NOT be exposed.

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
- **WHEN** the user runs `a1 solo`, `a1 tabs`, or `a1 ui`
- **THEN** A1 SHALL treat the word as outside the grammar and return quietly without selecting another runtime

#### Scenario: Two launches select one session
- **WHEN** two A1 processes select the same canonical session file
- **THEN** the shared session-writer guard, implemented without native code, SHALL admit one writer and apply the existing safe conflict behavior to the other

### Requirement: Interactive launch forms run as one directly attached process
Every interactive launch SHALL run as one directly attached process tree: the launcher selects the approved immutable release and runs its UI entry with inherited standard streams, and nothing survives the launcher. The launcher SHALL start no supervisor, detached host, job object, or process group, SHALL NOT read terminal input or parse output, and SHALL NOT select a second rendering path. Closing the terminal SHALL end the tree through ordinary operating-system behavior.

#### Scenario: Launch owned A1
- **WHEN** the shell selects bare `a1` or `a1 --session …`
- **THEN** the owned product UI SHALL run as the launcher's one directly attached child and SHALL exit when the launcher's terminal closes

#### Scenario: Launch the Pi comparison
- **WHEN** the shell selects prerelease `a1 pi`
- **THEN** the owned comparison UI SHALL run under the same single-process boundary without changing the shared rendering pipeline

#### Scenario: Another instance is active
- **WHEN** the shell launches while one or more interactive instances already exist
- **THEN** it SHALL create another independent process tree rather than acquiring a product-wide foreground slot or contacting the other instances

#### Scenario: The UI exits uncleanly
- **WHEN** the UI child ends with an unexpected status while the launcher still owns the terminal
- **THEN** the launcher SHALL perform the bounded terminal reset and print the armed resume notice once, and SHALL NOT restart the child

### Requirement: Help advertises the single-agent grammar and unsupported commands are quiet
Help and usage SHALL advertise only the bare launch, the `--session` launch, the `session` context forms, and the direct `help`, `version`, `install`, `remove`, `uninstall`, `list`, and `update` forms, never `solo`, `tabs`, alias sections, or `a1 pi` package forms; `a1 help`, `--help`, and `-h` SHALL be equivalent. A word outside the grammar SHALL be a silent successful no-op that starts nothing. A malformed recognized command MAY fail with one focused diagnostic, never the complete help.

#### Scenario: Help is requested
- **WHEN** the user runs `a1 help`, `a1 --help`, or `a1 -h`
- **THEN** A1 SHALL print the same direct-command list appropriate to that build and exit successfully without launching a runtime
- **AND** the list SHALL omit `solo`, `tabs`, compatibility help/version flags, and `a1 pi` package aliases

#### Scenario: Unknown top-level word is given
- **WHEN** the user runs `a1 sdjjhd`, `a1 solo`, or `a1 tabs`
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

#### Scenario: Update help is requested
- **WHEN** the user runs `a1 update --help`
- **THEN** A1 SHALL describe the stable, development, extension, model, and single-package update forms together and exit without updating

## MODIFIED Requirements

### Requirement: Stable platform claims require certification
The owned terminal UI SHALL be pure JavaScript on Node and SHALL carry no platform-specific native artifact. A stable support claim for a platform SHALL require that platform's exact-package validation lane to pass; no physical terminal, native addon, or terminal-host certification SHALL be required or implied.

#### Scenario: Uncertified preview is published
- **WHEN** a manually accepted candidate passes its selected gates on some but not all supported platform lanes
- **THEN** it MAY publish only as an explicitly uncertified development preview and SHALL NOT move npm `latest` or claim stable support for the unvalidated platforms

#### Scenario: The package is inspected
- **WHEN** a published package is unpacked on any platform
- **THEN** it SHALL contain no `.node` addon, native manifest, or platform-specific directory

## REMOVED Requirements

### Requirement: Interactive launch forms use the owned Pi UI pipeline
**Reason**: Resident tabs, `a1 solo`, and the resident fallback are removed; the direct single-agent surface is the only product launch.

**Migration**: Run `a1` instead of `a1 solo`; resume with `a1 --session <id>`.

### Requirement: Interactive launch forms share one non-detachable instance boundary
**Reason**: Launch-instance containment, the launch guardian, and the resident capability are removed.

**Migration**: None.

### Requirement: Help is explicit and unsupported commands are quiet
**Reason**: `solo` and `tabs` leave the grammar and help.

**Migration**: None.

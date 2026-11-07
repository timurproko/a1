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

### Requirement: Installed interactive startup is measurable and bounded across update, restart, and warm launches
A1 SHALL measure invocation-to-first-usable-frame startup without changing normal terminal output. A first usable frame means the selected owned UI has painted and its editor accepts input. On the accepted Windows release runner, the first `a1` or `a1 pi` launch after a completed exact-package update or after a machine restart SHALL reach that state within 5 seconds, and a subsequent warm launch SHALL reach it within 3 seconds.

#### Scenario: Launch follows a successful update
- **WHEN** the exact packaged updater reports success and the user starts either supported interactive profile on the accepted Windows release runner
- **THEN** the selected UI SHALL paint an input-ready frame within 5 seconds of command invocation

#### Scenario: Launch follows machine restart
- **WHEN** an approved active release remains installed and no A1 process has run since sign-out or machine restart
- **THEN** either supported interactive profile SHALL validate the selected immutable content and paint an input-ready frame within 5 seconds of command invocation

#### Scenario: Launch uses warmed immutable content
- **WHEN** the same active release has already completed one interactive startup or update warmup on the accepted Windows release runner
- **THEN** another supported interactive launch SHALL paint an input-ready frame within 3 seconds

#### Scenario: Startup tracing is enabled
- **WHEN** an isolated diagnostic run explicitly enables startup timing evidence
- **THEN** A1 SHALL report bounded durations for bootstrap, durable release validation, UI child startup, UI module loading, Pi services, resource loading, session creation, and first render without exposing credentials or prompt/session content

#### Scenario: Startup tracing is not enabled
- **WHEN** the user performs an ordinary interactive launch
- **THEN** A1 SHALL not print startup timing detail or an additional loading transcript

### Requirement: Interactive startup evaluates a bounded single-process readiness graph
An installed interactive launch SHALL load and evaluate before first input-ready render only the runtime capabilities required to render the selected profile and safely accept user input. Settings, engine initialization, selected session state, model scope, executable resources, tools, extensions, and terminal behavior that affect the first accepted prompt SHALL be ready before that frame. Optional workflows and presentation features that do not affect those guarantees SHALL NOT enlarge the eager startup graph.

On the accepted Defender-enabled Windows release runner, every interactive profile the candidate itself advertises SHALL reach the first input-ready frame within 2 seconds after a completed update and on a warm launch. On a restart-equivalent launch, in which no A1 process has run since the approved active release was last validated, each advertised profile SHALL reach that frame within 2.5 seconds. The measured set SHALL follow the candidate's own version-derived capabilities rather than a fixed pair: a prerelease candidate advertises `a1` and `a1 pi` and SHALL measure both, while a stable candidate advertises `a1` alone and SHALL measure it alone and SHALL prove that `a1 pi` remains the quiet no-op that a non-prerelease build is required to expose. The deliberate absence of the comparison profile SHALL NOT be recorded as a startup failure or as a missing measurement. These budgets SHALL apply to every supported Windows Node lane and SHALL be evaluated on the first attempt of every measurement. Stable publication SHALL fail on any first-attempt overrun. Development previews, nightly publication, and complete regression SHALL record every measurement as evidence and SHALL judge a lane, profile, and launch kind regressed only when its three most recent consecutive `develop` measurements of the same workflow all exceed the budget; a single overrun on those channels is a warning with the measured phases, never a run failure.

#### Scenario: First launch follows update
- **WHEN** a completed exact-package update has activated and warmed a new release
- **THEN** every advertised interactive profile SHALL paint a genuinely input-ready frame within 2 seconds without loading optional feature implementations solely for future use

#### Scenario: Warm launch starts another session
- **WHEN** the active release and dependency layer have already served an interactive launch
- **THEN** every advertised interactive profile SHALL paint a genuinely input-ready frame within 2 seconds

#### Scenario: Restart-equivalent launch
- **WHEN** an approved active release has valid durable certification and no A1 process has run since it was last validated
- **THEN** every advertised interactive profile SHALL validate the release, start its UI child, and paint a genuinely input-ready frame within 2.5 seconds

#### Scenario: A stable candidate advertises no comparison profile
- **WHEN** first-attempt startup validation runs against a candidate whose version declares no prerelease
- **THEN** the gate SHALL measure the `a1` profile alone against the same budgets and lanes
- **AND** it SHALL confirm that `a1 pi` exits quietly without launching an interactive profile
- **AND** that quiet exit SHALL NOT be reported as a launch that ended before first render

#### Scenario: User submits immediately after first render
- **WHEN** the editor accepts input at the first input-ready frame
- **THEN** the selected settings, model scope, resources, tools, extensions, terminal semantics, and session state SHALL already apply to that submission

#### Scenario: Optional feature is first requested
- **WHEN** the user invokes a deferred settings, selector, package, rich-rendering, clipboard, image, export, or similar optional capability
- **THEN** A1 SHALL load it without changing its documented behavior or losing the triggering interaction

#### Scenario: A scheduled channel measures one overrun
- **WHEN** a nightly publication or complete regression measurement exceeds its budget while the two previous `develop` measurements of that lane, profile, and launch kind did not
- **THEN** the run SHALL record the measurement, annotate the overrun with its dominant phases, and succeed

#### Scenario: A scheduled channel measures a persistent overrun
- **WHEN** the three most recent consecutive `develop` measurements of one lane, profile, and launch kind all exceed the budget
- **THEN** the startup budget SHALL be judged regressed for that key and the nightly regression triage SHALL propose its fix with the three measurements as evidence

## MODIFIED Requirements

### Requirement: Stable platform claims require certification
The owned terminal UI SHALL be pure JavaScript on Node and SHALL carry no platform-specific native artifact. A stable support claim for a platform SHALL require that platform's exact-package validation lane to pass; no physical terminal, native addon, or terminal-host certification SHALL be required or implied.

#### Scenario: Uncertified preview is published
- **WHEN** a manually accepted candidate passes its selected gates on some but not all supported platform lanes
- **THEN** it MAY publish only as an explicitly uncertified development preview and SHALL NOT move npm `latest` or claim stable support for the unvalidated platforms

#### Scenario: The package is inspected
- **WHEN** a published package is unpacked on any platform
- **THEN** it SHALL contain no `.node` addon, native manifest, or platform-specific directory

### Requirement: Every package update is one immediate replacement command
The installed application SHALL expose `a1 update` as the stable update command
resolving npm tag `latest`, and `a1 update --develop` as the development-preview
update command resolving the internal npm development dist-tag. A positive preview
number or full numbered preview version MAY follow `--develop` to select one
immutable publication; the preview number is the pull request number recorded in a
published preview's manifest, or the trailing number of a preview published before
pull requests were recorded. Invocation SHALL authorize the existing ownership-safe
replacement transaction and return to the invoking shell after reporting its final
result.

The application SHALL NOT expose any `update:<selector>` command or `a1 update self`
alias. Removed forms SHALL be unsupported silent no-ops and SHALL NOT resolve the
registry, start the interactive runtime, install anything, or print migration guidance.

#### Scenario: Replace the current preview
- **WHEN** the user runs `a1 update --develop` while an older verified A1 release is active
- **THEN** A1 SHALL perform the replacement transaction using the exact version selected by the internal development dist-tag and return to the terminal prompt

#### Scenario: Selected channel is current
- **WHEN** the selected npm tag resolves to the exact active A1 release version
- **THEN** A1 SHALL report that the channel is current without reinstalling it

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
- **THEN** A1 SHALL exit successfully without output or side effects

### Requirement: Version output follows the Pi command convention
The installed application SHALL expose `a1 version` as the preferred version command and SHALL retain equivalent `a1 --version` and `a1 -v` compatibility forms. None of those forms SHALL start or mutate the interactive runtime, release store, active release, or update transaction. Stable releases and development builds SHALL both report `Current`, `Develop`, and `Release` in that order. Both SHALL discover authoritative package dist-tags as one coherent result; an absent development tag SHALL be unavailable without a diagnostic, while discovery failure SHALL make every remote field unavailable with one concise `A1` diagnostic, keep the `Current` line, and exit successfully.

A development build SHALL append the recorded pull request to its `Current` line as ` (#<number>)` when its installed manifest records one. Both stable releases and development builds SHALL append the recorded pull request to their `Develop` line when the development head's published manifest records one and that manifest can be read within the discovery budget. A missing or unreadable record SHALL leave the bare version on that line without a diagnostic. Stable `Current` lines and `Release` lines SHALL NOT carry a pull request.

#### Scenario: Stable release version
- **WHEN** the user runs `a1 version`, `a1 --version`, or `a1 -v` from stable release `0.3.0`, the `next` dist-tag is `0.4.0-dev.123`, and the `latest` dist-tag is `0.3.1`
- **THEN** every form SHALL print `Current: 0.3.0`, `Develop: 0.4.0-dev.123`, and `Release: 0.3.1` in that order, appending the development head's recorded pull request when available

#### Scenario: Stable release version without registry access
- **WHEN** the user runs `a1 version` from a stable release and dist-tag discovery fails
- **THEN** A1 SHALL print `Current: <installed version>`, `Develop: unavailable`, and `Release: unavailable`, emit one concise `A1` diagnostic, and exit successfully

#### Scenario: Stable release with a recorded development head
- **WHEN** the user runs `a1 version` from stable release `0.3.0` whose installed manifest records pull request 100 and the `next` dist-tag is `0.4.0-dev.123` whose manifest records pull request 123
- **THEN** A1 SHALL print `Current: 0.3.0` without pull-request attribution, `Develop: 0.4.0-dev.123 (#123)`, and the `Release` line

#### Scenario: Development tag is absent
- **WHEN** a stable release or development build discovers a valid `latest` dist-tag but no `next` dist-tag
- **THEN** A1 SHALL print its Current line, `Develop: unavailable`, and the resolved Release line without a diagnostic

#### Scenario: Development build versions
- **WHEN** the user runs `a1 version`, `a1 --version`, or `a1 -v` from a development build
- **THEN** every form SHALL display the same `Current`, `Develop`, and `Release` result in order, applying the declared unavailable behavior when remote channel metadata is absent or unreachable

#### Scenario: Development build with recorded pull requests
- **WHEN** the user runs `a1 version` from `0.2.7-dev.1217` whose manifest records pull request 842 and the `next` dist-tag is `0.2.7-dev.1218` whose manifest records pull request 828
- **THEN** A1 SHALL print `Current: 0.2.7-dev.1217 (#842)`, `Develop: 0.2.7-dev.1218 (#828)`, and the `Release` line

#### Scenario: Development build without a recorded pull request
- **WHEN** the installed development manifest or development head manifest records no pull request, or the head manifest cannot be read from either installed channel
- **THEN** that line SHALL print the bare version and A1 SHALL emit no diagnostic for the missing record

#### Scenario: Old subcommand notation
- **WHEN** the user runs the formerly unsupported `a1 version` notation
- **THEN** A1 SHALL now treat it as the preferred equivalent of `a1 --version` and `a1 -v`

### Requirement: Interrupted update preserves the public command
After an update accepts cancellation or loses its invoking updater or terminal process, A1 SHALL automatically leave or restore the complete platform launcher set needed to invoke `a1`. The recovered command SHALL execute either the prior verified immutable release or the completely installed target and SHALL retain the durable update transaction needed to continue or roll back. Recovery SHALL require no manual npm installation, launcher reconstruction, process termination, or A1 state deletion.

#### Scenario: User cancels during global package replacement
- **WHEN** the user interrupts `a1 update` while the package manager has removed or renamed a public launcher
- **THEN** A1 SHALL coordinate cancellation and SHALL NOT return an acknowledged cancellation to the shell until the complete platform launcher set is callable

#### Scenario: Invoking updater or terminal exits
- **WHEN** the invoking updater or its terminal process exits during global package replacement
- **THEN** an independently surviving recovery owner SHALL complete a safe package boundary or restore a verified recovery launcher without user intervention

#### Scenario: User invokes a restored recovery launcher
- **WHEN** package replacement did not leave a complete installed target and the user next invokes `a1`
- **THEN** the launcher SHALL use verified recovery evidence to run the prior immutable release or continue the recorded transaction to one verified active or rollback release

#### Scenario: Recovery authority is invalid
- **WHEN** launcher recovery evidence names an unexpected path, package, transaction, release identity, or changed launcher payload
- **THEN** A1 SHALL reject that evidence and SHALL NOT execute or install content from it

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

### Requirement: Installed interactive startup is measurable and bounded
**Reason**: Restated under a new name without its resident-tab, supervisor, launch-guardian, containment, native-host, or timestamp scenarios, which no longer describe the single-agent product.

**Migration**: See the ADDED requirement "Installed interactive startup is measurable and bounded across update, restart, and warm launches".

### Requirement: Interactive startup evaluates a bounded readiness graph
**Reason**: Restated under a new name without its resident-tab, supervisor, launch-guardian, containment, native-host, or timestamp scenarios, which no longer describe the single-agent product.

**Migration**: See the ADDED requirement "Interactive startup evaluates a bounded single-process readiness graph".

# A1 Shell Specification

## Purpose

Defines the installed A1 command surface, immutable release behavior, and shared owned interactive rendering path.

## Requirements

### Requirement: Every package update is one immediate replacement command
The installed application SHALL expose `a1 update` as the stable update command
resolving npm tag `latest`, and `a1 update --develop` as the development-preview
update command resolving the internal npm development dist-tag. A positive preview
number or full numbered preview version MAY follow `--develop` to select one
immutable publication. Invocation SHALL authorize the existing ownership-safe
replacement transaction and return to the invoking shell after reporting its final
result.

The application SHALL NOT expose any `update:<selector>` command or `a1 update self`
alias. Removed forms SHALL be unsupported silent no-ops and SHALL NOT resolve the
registry, start the supervisor, install anything, or print migration guidance.

#### Scenario: Replace the current preview
- **WHEN** the user runs `a1 update --develop` while an older verified A1 cohort is active
- **THEN** A1 SHALL perform the replacement transaction using the exact version selected by the internal development dist-tag and return to the terminal prompt

#### Scenario: Selected channel is current
- **WHEN** the selected npm tag resolves to the exact active A1 release version
- **THEN** A1 SHALL report that the channel is current without reinstalling it

#### Scenario: Ownership cannot be verified
- **WHEN** A1 cannot prove that a process belongs to the active cohort
- **THEN** the update SHALL fail safely without terminating that process or deleting control state

#### Scenario: Update is interrupted
- **WHEN** an update is interrupted after a durable transaction phase
- **THEN** the next invocation SHALL continue or roll back to one verified active cohort without manual cleanup

#### Scenario: Launch after a completed update
- **WHEN** the user runs bare `a1` after the update command reported success
- **THEN** A1 SHALL launch the already active target without printing installation or activation messages

#### Scenario: Replace with a numbered preview
- **WHEN** the user runs `a1 update --develop 107` and exactly one published preview ends in `-dev.107`
- **THEN** A1 SHALL install that exact immutable preview

#### Scenario: Replace with an exact preview
- **WHEN** the user runs `a1 update --develop 0.1.8-dev.107` and that preview is published
- **THEN** A1 SHALL install exactly `0.1.8-dev.107`

#### Scenario: Removed update notation is used
- **WHEN** the user runs `a1 update:develop`, `a1 update:107`, `a1 update:0.1.8-dev.107`, or `a1 update self`
- **THEN** A1 SHALL exit successfully without output or side effects

### Requirement: Version output follows the Pi command convention
The installed application SHALL expose equivalent `a1 --version` and `a1 -v` forms and SHALL NOT expose a `version` subcommand or start or mutate the interactive runtime, supervisor, storage, release cohort, or update transaction. A stable release SHALL print only its installed exact semantic version without remote discovery. A development build SHALL report `Current`, `Develop`, and `Release` in that order and SHALL discover authoritative package dist-tags as one coherent result; an absent development tag SHALL be unavailable without a diagnostic, while discovery failure SHALL make both remote fields unavailable with one concise `A1` diagnostic.

#### Scenario: Stable release version
- **WHEN** the user runs `a1 --version` from a stable release
- **THEN** A1 SHALL print only the installed exact semantic version without querying remote channels

#### Scenario: Development build versions
- **WHEN** the user runs `a1 --version` from a development build
- **THEN** A1 SHALL display `Current`, `Develop`, and `Release` in order, applying the declared unavailable behavior when remote channel metadata is absent or unreachable

#### Scenario: Old subcommand notation
- **WHEN** the user runs `a1 version`
- **THEN** A1 SHALL reject it as an unknown command

### Requirement: Interactive launch forms use the owned Pi UI pipeline
Bare `a1` SHALL launch the A1-owned product surface directly. Explicit prerelease `a1 pi` SHALL use the same owned rendering and input pipeline with A1-specific surfaces withheld and Pi's ordinary user profile selected. Profile selection SHALL NOT introduce transparent child attachment, a PTY, a terminal parser, a byte relay, or a second rendering path. The redundant `a1 ui` route SHALL NOT be exposed.

#### Scenario: Launch bare A1
- **WHEN** the user runs `a1`
- **THEN** A1 SHALL start the owned product UI without requiring a profile argument

#### Scenario: Launch after a prior exit
- **WHEN** the user runs bare A1 after a previous owned foreground session exited
- **THEN** A1 SHALL start a fresh owned session without replaying the prior retained terminal surface

#### Scenario: Launch the Pi comparison
- **WHEN** the user runs prerelease `a1 pi`
- **THEN** A1 SHALL use the shared owned pipeline with product surfaces withheld and Pi's ordinary profile selected

#### Scenario: Request the removed development alias
- **WHEN** the user runs `a1 ui`
- **THEN** A1 SHALL reject the unsupported profile and SHALL NOT silently select another runtime

### Requirement: Stable platform claims require certification
The owned terminal UI architecture SHALL remain application-agnostic across its native platform launchers, but a stable terminal support or parity claim for a platform SHALL require the separately deferred physical and exact-package certification for that platform.

#### Scenario: Uncertified preview is published
- **WHEN** a manually accepted candidate passes applicable non-desktop gates without complete physical certification
- **THEN** it MAY publish only as an explicitly uncertified development preview and SHALL NOT move npm `latest` or claim stable cross-platform support

### Requirement: Official npm distribution has one fresh package identity
The official npm distribution SHALL be named `@timurproko/a1`, SHALL begin its independent stable version lineage at `0.1.0`, and SHALL declare only `a1` as a public executable. Internal process entry files MAY remain in the package payload but SHALL NOT be installed as public npm executables. After `@timurproko/a1@0.1.0` is verified, every published version of the obsolete `@timurproko/addone` package SHALL be deprecated toward `@timurproko/a1`. The obsolete package SHALL NOT be retained as a compatibility package; later unpublication MAY occur as owner-controlled registry administration when npm policy permits.

#### Scenario: Inspect fresh package metadata
- **WHEN** the exact stable `@timurproko/a1@0.1.0` tarball is packed
- **THEN** its manifest SHALL name `@timurproko/a1` at version `0.1.0` and its npm bin map SHALL contain exactly the `a1` executable

#### Scenario: Verify the fresh stable publication
- **WHEN** `@timurproko/a1@0.1.0` has been published
- **THEN** npm `latest` SHALL resolve to that exact version and registry integrity SHALL match the accepted tarball

#### Scenario: Deprecate the obsolete package
- **WHEN** the fresh stable publication has been verified and npm policy rejects whole-package deletion
- **THEN** every published version of `@timurproko/addone` SHALL carry an npm deprecation directing users to `@timurproko/a1`, and current product behavior SHALL continue to reject the obsolete identity

### Requirement: Package identity is authoritative throughout release handling
Version discovery, self-update, installed metadata lookup, immutable release derivation, release validation, publication evidence, and registry verification SHALL use `@timurproko/a1` as the sole accepted package identity. The product SHALL NOT implement a bridge release or compatibility path for installed `@timurproko/addone` packages or their materialized release state.

#### Scenario: Materialize the new package
- **WHEN** A1 derives or validates an immutable release from the installed package
- **THEN** it SHALL accept `@timurproko/a1` metadata and SHALL reject `@timurproko/addone` as an unexpected package identity

#### Scenario: Query release channels
- **WHEN** `a1 --version`, `a1 update`, or `a1 update:next` resolves npm metadata
- **THEN** every registry query and installation target SHALL reference `@timurproko/a1`

### Requirement: Interactive launch forms share one non-detachable instance boundary
The immutable interactive launcher SHALL establish the same non-detachable launch-instance ownership boundary before selecting bare `a1` or prerelease `a1 pi`. Both forms SHALL retain the shared owned rendering and input pipeline inside that boundary. The lifecycle layer SHALL own process containment and cleanup without reading terminal input, parsing output, reconstructing display state, or selecting a second rendering path.

#### Scenario: Launch owned A1
- **WHEN** the shell selects bare `a1`
- **THEN** the owned product UI and every process it creates SHALL belong to that command's launch instance

#### Scenario: Launch the Pi comparison
- **WHEN** the shell selects prerelease `a1 pi`
- **THEN** the owned comparison UI and every process it creates SHALL belong to that command's launch instance without changing the shared rendering pipeline

#### Scenario: Another instance is active
- **WHEN** the shell launches while one or more interactive instances already exist
- **THEN** it SHALL create another independent instance rather than acquiring a product-wide foreground slot

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
- **THEN** the launcher SHALL use verified recovery evidence to run the prior immutable release or continue the recorded transaction to one verified active or rollback cohort

#### Scenario: Recovery authority is invalid
- **WHEN** launcher recovery evidence names an unexpected path, package, transaction, release identity, or changed launcher payload
- **THEN** A1 SHALL reject that evidence and SHALL NOT execute or install content from it

### Requirement: Installed interactive startup is measurable and bounded
A1 SHALL measure invocation-to-first-usable-frame startup without changing normal terminal output. A first usable frame means the selected owned UI has painted and its editor accepts input. On the accepted Windows release runner, the first `a1` or `a1 pi` launch after a completed exact-package update or after loss of the active release's live supervisor SHALL reach that state within 5 seconds, and a subsequent warm launch SHALL reach it within 3 seconds.

#### Scenario: Launch follows a successful update
- **WHEN** the exact packaged updater reports success and the user starts either supported interactive profile on the accepted Windows release runner
- **THEN** the selected UI SHALL paint an input-ready frame within 5 seconds of command invocation

#### Scenario: Launch follows supervisor loss or machine restart
- **WHEN** an approved active release remains installed but its previously verified supervisor is absent or dead after process loss, sign-out, or machine restart
- **THEN** either supported interactive profile SHALL validate the selected immutable content and paint an input-ready frame within 5 seconds of command invocation

#### Scenario: Launch uses warmed immutable content
- **WHEN** the same active release has already completed one interactive startup or update warmup on the accepted Windows release runner
- **THEN** another supported interactive launch SHALL paint an input-ready frame within 3 seconds

#### Scenario: Startup tracing is enabled
- **WHEN** an isolated diagnostic run explicitly enables startup timing evidence
- **THEN** A1 SHALL report bounded durations for bootstrap, durable release validation, supervisor startup, guardian startup, UI module loading, Pi services, resource loading, session creation, and first render without exposing credentials or prompt/session content

#### Scenario: Startup tracing is not enabled
- **WHEN** the user performs an ordinary interactive launch
- **THEN** A1 SHALL not print startup timing detail or an additional loading transcript

### Requirement: Interactive startup evaluates a bounded readiness graph
An installed interactive launch SHALL load and evaluate before first input-ready render only the runtime capabilities required to render the selected profile and safely accept user input. Settings, engine initialization, selected session state, model scope, executable resources, tools, extensions, terminal behavior, and launch containment that affect the first accepted prompt SHALL be ready before that frame. Optional workflows and presentation features that do not affect those guarantees SHALL NOT enlarge the eager startup graph.

On the accepted Defender-enabled Windows release runner, both `a1` and `a1 pi` SHALL reach the first input-ready frame within 2 seconds after a completed update and on a warm launch. When the active release has no live supervisor, both profiles SHALL reach that frame within 2.5 seconds. These budgets SHALL apply to every supported Windows Node lane and SHALL be evaluated on the first attempt. Development previews record these budgets as evidence; nightly publication, stable publication, and complete regression enforce them.

#### Scenario: First launch follows update
- **WHEN** a completed exact-package update has activated and warmed a new release
- **THEN** either interactive profile SHALL paint a genuinely input-ready frame within 2 seconds without loading optional feature implementations solely for future use

#### Scenario: Warm launch starts another session
- **WHEN** the active release and dependency layer have already served an interactive launch
- **THEN** either interactive profile SHALL paint a genuinely input-ready frame within 2 seconds

#### Scenario: Launch replaces a missing supervisor
- **WHEN** an approved active release has valid durable certification but no live supervisor
- **THEN** either interactive profile SHALL validate the release, start its replacement supervisor, and paint a genuinely input-ready frame within 2.5 seconds

#### Scenario: User submits immediately after first render
- **WHEN** the editor accepts input at the first input-ready frame
- **THEN** the selected settings, model scope, resources, tools, extensions, terminal semantics, and session state SHALL already apply to that submission

#### Scenario: Optional feature is first requested
- **WHEN** the user invokes a deferred settings, selector, package, rich-rendering, clipboard, image, export, or similar optional capability
- **THEN** A1 SHALL load it without changing its documented behavior or losing the triggering interaction

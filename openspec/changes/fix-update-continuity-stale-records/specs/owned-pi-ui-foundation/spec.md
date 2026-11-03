## MODIFIED Requirements

### Requirement: The owned shell announces an available A1 release in pinned Pi's style
In bare A1 `Update: Notify` SHALL preserve the existing informational docked `Update Available` popup, channel-appropriate command, stable changelog link and session-only close control without installation. `Update: No` SHALL produce no release-update UI because no check runs.

In default `Auto`, the owned shell SHALL show no availability popup, bordered notice, changelog link, close control, command instruction or installation progress. After verified compatible client activation, an older connected resident client SHALL show `Update installed, restart to update` right-aligned on the existing paint-only acknowledgement line above the editor in one success-green foreground. It SHALL allocate no row and change no transcript, Working status, dock, pointer or editor geometry. Restart readiness SHALL refer to the client that reconnects to live execution, not a promise or requirement to replace every live Agent.

When package replacement and candidate certification succeeded but compatible activation is currently blocked, the observing Auto-mode client SHALL instead show exact text `Update prepared; activation blocked` in the same bounded non-transcript update-status area. The blocked status SHALL NOT claim restart readiness, SHALL NOT expose paths, PIDs, credentials, protocol details or raw native diagnostics, and SHALL NOT take focus or offer a destructive action. It SHALL remain distinct from ordinary failed, skipped, pending, malformed, or uncertified attempts, which SHALL show no automatic failure popup.

Copy acknowledgement SHALL take priority for its existing lifetime/replacement behavior and the applicable prepared-blocked or restart-ready status SHALL return afterward while it remains true for that process. Narrow layouts MAY clip the message without changing usable editor geometry. The status SHALL take no focus/input and SHALL not be dismissible while it truthfully describes update state. After successful updated-client reconnect, Agents that retain old execution custody SHALL NOT continually request that same completed client restart.

`a1 pi` and direct nonresident modes SHALL retain their process-scoped compact non-transcript update status with the same exact wording/color rules and existing extension-package presentation. Starting those processes from the activated release SHALL show no stale status. A prepared-blocked status SHALL transition to restart readiness only after verified activation; invalidated preparation or ordinary failure SHALL remove it without displaying raw automatic failure details.

#### Scenario: Announce a stable release
- **WHEN** bare A1 in Notify discovers newer stable `0.3.1`
- **THEN** it SHALL show the existing `Update Available` popup with `a1 update`, stable changelog link and no installation

#### Scenario: Announce a development release
- **WHEN** bare A1 in Notify discovers newer development `0.3.1-dev.652`
- **THEN** it SHALL show the existing popup with `a1 update --develop`, no changelog line and no installation

#### Scenario: Result arrives after the first frame
- **WHEN** Notify discovery, prepared-blocked state, or verified compatible Auto activation arrives after interaction begins
- **THEN** the applicable notice SHALL appear without clearing the editor, moving focus or interrupting work

#### Scenario: Dock and dismiss in bare A1
- **WHEN** Notify reports a release during a turn
- **THEN** the popup SHALL retain its existing dock geometry and session-only close behavior

#### Scenario: Auto installation completes
- **WHEN** a compatible candidate becomes active while the older resident client views a working Agent
- **THEN** the success-green restart-ready status SHALL appear on the existing acknowledgement line without altering live working presentation or geometry
- **AND** no Agent SHALL restart or wait for idle to apply that client update

#### Scenario: Auto preparation is activation-blocked
- **WHEN** the exact candidate is certified but continuity currently prevents compatible activation
- **THEN** `Update prepared; activation blocked` SHALL appear in the bounded update-status area without a restart instruction
- **AND** the notice SHALL contain no raw blocker detail or destructive remediation

#### Scenario: Copy acknowledgement temporarily replaces restart readiness
- **WHEN** successful copy produces `Copied N chars to clipboard` while prepared-blocked or restart readiness applies
- **THEN** copy feedback SHALL replace the update status for its existing lifetime and the applicable status SHALL return afterward

#### Scenario: Repeated copy acknowledgement retains priority
- **WHEN** another copy succeeds before the previous acknowledgement expires
- **THEN** the newer acknowledgement SHALL replace it and restart its existing lifetime before applicable update status returns

#### Scenario: Blocked activation later succeeds
- **WHEN** activation-only retry verifies continuity and commits the prepared candidate
- **THEN** the blocked status SHALL be replaced by `Update installed, restart to update`
- **AND** both statuses SHALL NOT appear simultaneously

#### Scenario: Both update notices apply
- **WHEN** A1 update status and extension-package availability both apply in `a1 pi`
- **THEN** A1 status SHALL use its compact region and extension availability SHALL retain its transcript presentation without an added A1 banner

#### Scenario: No newer release
- **WHEN** discovery is skipped, No is selected or no newer release exists
- **THEN** no A1 update status or popup SHALL render

#### Scenario: Explicit update completes in another terminal
- **WHEN** an older Auto-mode client observes explicit compatible client activation
- **THEN** it SHALL show the same restart-ready status without an availability popup

#### Scenario: The terminal is narrow
- **WHEN** complete applicable update text does not fit
- **THEN** it SHALL clip safely without changing editor geometry or hiding Working

#### Scenario: The user restarts
- **WHEN** the updated resident client reconnects to the same busy and idle Agents
- **THEN** it SHALL preserve their live access and SHALL NOT show stale client restart readiness merely because their execution code originated on an older release

#### Scenario: Prepared proof becomes invalid
- **WHEN** a previously prepared candidate can no longer be certified or matched to the installed target
- **THEN** the blocked status SHALL disappear and no raw automatic failure popup SHALL replace it

#### Scenario: Automatic update does not succeed
- **WHEN** an attempt fails, remains merely pending, is malformed, or cannot establish certified preparation
- **THEN** no prepared-blocked or successful/restart-ready update status SHALL render and existing live access SHALL remain preserved

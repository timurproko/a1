## MODIFIED Requirements

### Requirement: The owned shell announces an available A1 release in pinned Pi's style
In bare A1 `Update: Notify` SHALL preserve the existing informational docked `Update Available` popup, channel-appropriate command, stable changelog link and session-only close control without installation. `Update: No` SHALL produce no release-update UI because no check runs.

In default `Auto`, the owned shell SHALL show no availability popup, bordered notice, changelog link, close control, command instruction or installation progress. After verified compatible client activation, an older connected resident client SHALL show `Update installed, restart to update` right-aligned on the existing paint-only acknowledgement line above the editor in one success-green foreground. It SHALL allocate no row and change no transcript, Working status, dock, pointer or editor geometry. Restart readiness SHALL refer to the client that reconnects to live execution, not a promise or requirement to replace every live Agent. Candidate preparation without verified compatible activation SHALL show no restart-ready status.

Copy acknowledgement SHALL take priority for its existing lifetime/replacement behavior and restart readiness SHALL return afterward while that older client remains connected. Narrow layouts MAY clip the message without changing usable editor geometry. The status SHALL take no focus/input and SHALL not be dismissible while it truthfully describes the connected client. After successful updated-client reconnect, Agents that retain old execution custody SHALL NOT continually request that same completed client restart.

`a1 pi` and direct nonresident modes SHALL retain their process-scoped compact non-transcript restart status with the same wording/color and existing extension-package presentation. Starting those processes from the activated release SHALL show no stale status. A failed, skipped, pending, malformed, incompatible or unverifiable activation SHALL show no release-update UI.

#### Scenario: Announce a stable release
- **WHEN** bare A1 in Notify discovers newer stable `0.3.1`
- **THEN** it SHALL show the existing `Update Available` popup with `a1 update`, stable changelog link and no installation

#### Scenario: Announce a development release
- **WHEN** bare A1 in Notify discovers newer development `0.3.1-dev.652`
- **THEN** it SHALL show the existing popup with `a1 update --develop`, no changelog line and no installation

#### Scenario: Result arrives after the first frame
- **WHEN** Notify discovery or verified compatible Auto activation completes after interaction begins
- **THEN** the applicable notice SHALL appear without clearing the editor, moving focus or interrupting work

#### Scenario: Dock and dismiss in bare A1
- **WHEN** Notify reports a release during a turn
- **THEN** the popup SHALL retain its existing dock geometry and session-only close behavior

#### Scenario: Auto installation completes
- **WHEN** a compatible candidate becomes active while the older resident client views a working Agent
- **THEN** the success-green restart-ready status SHALL appear on the existing acknowledgement line without altering live working presentation or geometry
- **AND** no Agent SHALL restart or wait for idle to apply that client update

#### Scenario: Copy acknowledgement temporarily replaces restart readiness
- **WHEN** successful copy produces `Copied N chars to clipboard` while restart readiness applies
- **THEN** copy feedback SHALL replace the status for its existing lifetime and readiness SHALL return afterward if the connected client remains old

#### Scenario: Repeated copy acknowledgement retains priority
- **WHEN** another copy succeeds before the previous acknowledgement expires
- **THEN** the newer acknowledgement SHALL replace it and restart its existing lifetime before applicable readiness returns

#### Scenario: Both update notices apply
- **WHEN** A1 activation and extension-package availability both apply in `a1 pi`
- **THEN** A1 readiness SHALL use its compact region and extension availability SHALL retain its transcript presentation without an added A1 banner

#### Scenario: No newer release
- **WHEN** discovery is skipped, No is selected or no newer release exists
- **THEN** no A1 update status or popup SHALL render

#### Scenario: Explicit update completes in another terminal
- **WHEN** an older Auto-mode client observes explicit compatible client activation
- **THEN** it SHALL show the same restart-ready status without an availability popup

#### Scenario: The terminal is narrow
- **WHEN** complete readiness text does not fit
- **THEN** it SHALL clip safely without changing editor geometry or hiding Working

#### Scenario: The user restarts
- **WHEN** the updated resident client reconnects to the same busy and idle Agents
- **THEN** it SHALL preserve their live access and SHALL NOT show stale client restart readiness merely because their execution code originated on an older release

#### Scenario: Automatic update does not succeed
- **WHEN** activation fails, remains pending, is incompatible or cannot be verified
- **THEN** no successful/restart-ready update status SHALL render and existing live access SHALL remain preserved

## ADDED Requirements

### Requirement: Updated client preserves live Agent interaction without migration UI
A compatible updated resident client SHALL reconnect the same logical/live Agents with preserved tab identity, names, order, selection, unsent input/attachments, queued work and active dialogs. It SHALL show current progress produced while detached and preserve normal working/idle/attention state. There SHALL be no update-specific disabled Agent, waiting-for-idle state, migration spinner or delayed restart of existing execution. Every source with a healthy compatible runtime route SHALL remain viewable and controllable through ordinary attach completion. A blocked/inaccessible placeholder SHALL NOT satisfy successful update continuity. Client version and execution origin SHALL remain truthful without relabelling an old live process as new engine code. Normal independent runtime faults retain their recovery UI and SHALL NOT be misreported as successful seamless update.

#### Scenario: Two working Agents and one idle Agent survive relaunch
- **WHEN** the user closes the terminal and reopens a compatibly updated A1
- **THEN** those same three tabs SHALL retain their live state and current output with normal interaction available on every Agent
- **AND** neither busy nor idle execution SHALL be restarted or disabled because of the update

#### Scenario: Permission request arrives while detached
- **WHEN** an Agent waits for a permission/trust/extension response while no terminal is attached
- **THEN** the updated client SHALL expose that same live interaction and deliver its response to the correct source/controller without dismissing it or recreating the Agent

#### Scenario: Existing Agent remains idle after update
- **WHEN** an Agent stays idle after client reconnect
- **THEN** it SHALL remain live and usable with no pending-migration indicator or automatic later update restart

## ADDED Requirements

### Requirement: The owned shell shows only the restart-ready update status
With `Update: No` the shell SHALL show no release-update UI. In `Auto` it SHALL show no availability popup, notice, changelog link, command, or installation progress; once a newer approved same-channel release is active, it SHALL show `Update installed, restart to update` right-aligned in success green on the existing paint-only acknowledgement line above the editor, allocating no row, changing no geometry or transcript, taking no focus, and not dismissible while true.

#### Scenario: Auto installation completes
- **WHEN** a newer approved same-channel release becomes active while the older process is running
- **THEN** the success-green restart-ready status SHALL appear on the existing acknowledgement line without altering live working presentation or geometry

#### Scenario: Result arrives after the first frame
- **WHEN** activation is observed after interaction begins
- **THEN** the status SHALL appear without clearing the editor, moving focus, or interrupting work

#### Scenario: Copy acknowledgement temporarily replaces restart readiness
- **WHEN** successful copy produces `Copied N chars to clipboard` while restart readiness applies
- **THEN** copy feedback SHALL replace the update status for its existing lifetime and the status SHALL return afterward

#### Scenario: Repeated copy acknowledgement retains priority
- **WHEN** another copy succeeds before the previous acknowledgement expires
- **THEN** the newer acknowledgement SHALL replace it and restart its existing lifetime before the update status returns

#### Scenario: Both update notices apply
- **WHEN** A1 update status and extension-package availability both apply in `a1 pi`
- **THEN** A1 status SHALL use its compact region and extension availability SHALL retain its transcript presentation without an added A1 banner

#### Scenario: No newer release
- **WHEN** discovery is skipped, `No` is selected, or no newer release exists
- **THEN** no A1 update status or popup SHALL render

#### Scenario: Explicit update completes in another terminal
- **WHEN** an older Auto-mode process observes an explicit activation performed elsewhere
- **THEN** it SHALL show the same restart-ready status without an availability popup

#### Scenario: The terminal is narrow
- **WHEN** the complete status text does not fit
- **THEN** it SHALL clip safely without changing editor geometry or hiding Working

#### Scenario: The user restarts
- **WHEN** the user exits and runs `a1` again after the status appeared
- **THEN** the new process SHALL execute the active release and SHALL show no restart-ready status

#### Scenario: Automatic update does not succeed
- **WHEN** an attempt fails, remains merely pending, is malformed, or cannot establish certified preparation
- **THEN** no update status or popup SHALL render and the running session SHALL be unaffected

#### Scenario: The comparison profile observes activation
- **WHEN** an older `a1 pi` process observes a newer approved same-channel active release
- **THEN** it SHALL show the same compact status with the same wording and color beside its existing extension-package presentation

### Requirement: Every older owned process shows restart readiness until it exits
When local release observation shows an approved active release newer than the executing version, an owned A1 process SHALL show `Update installed, restart to update` in its compact non-transcript status region until it exits, taking no focus or input, independently in every older bare-A1 and `a1 pi` process. The status SHALL describe executing-versus-active state only and SHALL NOT be suppressed by registry failure or by another process performing the activation.

#### Scenario: Several processes are older
- **WHEN** several active A1 processes execute an older release and another process activates a newer approved same-channel release
- **THEN** every older process SHALL show `Update installed, restart to update`
- **AND** the notice SHALL remain present in each process until it exits

#### Scenario: A current process starts
- **WHEN** a process executes the approved active release
- **THEN** it SHALL show no restart-ready status from that release

#### Scenario: The user did not run the update
- **WHEN** another process activated the newer release
- **THEN** the status SHALL NOT claim or imply that this process or its user launched the active release

## REMOVED Requirements

### Requirement: Updated client preserves live Agent interaction without migration UI
**Reason**: There is no resident client or live agent to reconnect after an update; a restart starts a fresh session on the new release.

**Migration**: Resume a previous conversation with `a1 --session <id>`.

### Requirement: The owned shell announces an available A1 release in pinned Pi's style
**Reason**: The `Notify` popup, prepared/blocked status, and resident predecessor handling are removed.

**Migration**: None.

### Requirement: Every older owned process shows persistent restart readiness
**Reason**: Resident and solo process classes no longer exist; the behavior applies to every owned process.

**Migration**: None.

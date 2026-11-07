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

### Requirement: Graceful user quit ends the single-agent process and returns control to the parent shell
The owned interactive UI SHALL treat `/quit` and the second `Ctrl+C` in the existing clear/exit chord as complete graceful-exit requests. Each route SHALL stop the agent session, dispose the owned presentation, restore all terminal modes and screen state owned by A1, terminate the interactive A1 process successfully, and return control to the invoking shell without requiring another signal or keystroke. The built-in quit command's autocomplete description SHALL be exactly `Quit`.

#### Scenario: Quit with the slash command
- **WHEN** the user submits `/quit` from an active owned interactive session
- **THEN** A1 SHALL complete graceful shutdown, restore the terminal, exit successfully, and make the invoking shell prompt available
- **AND** no inactive or blank A1 fullscreen surface SHALL remain

#### Scenario: Quit with the clear/exit chord
- **WHEN** the user presses `Ctrl+C` twice within the existing clear/exit interval
- **THEN** the second press SHALL complete the same graceful shutdown, terminal restoration, successful process exit, and parent-shell return as `/quit`

#### Scenario: Quit the comparison profile
- **WHEN** the user submits `/quit` or presses `Ctrl+C` twice in `a1 pi`
- **THEN** `a1 pi` SHALL stop its single agent session and return control to the parent shell in the same way

#### Scenario: An extension retains an event-loop handle
- **WHEN** owned UI cleanup has completed but a loaded extension leaves a server, timer, or comparable event-loop handle active
- **THEN** the interactive A1 executable SHALL preserve completed terminal restoration and configured exit output
- **AND** it SHALL still terminate successfully and return control to the parent shell

#### Scenario: Repository-local quit returns promptly
- **WHEN** a user quits an interactive A1 session launched through the supported repository-local development command
- **THEN** development-only cache persistence SHALL NOT introduce a visible post-restoration pause before the parent-shell prompt appears
- **AND** production compile-cache behavior and completed owned cleanup SHALL remain unchanged

#### Scenario: Describe the quit command
- **WHEN** slash-command autocomplete presents the built-in `quit` command
- **THEN** its description SHALL be `Quit`
- **AND** the description SHALL NOT include `Pi`, `A1`, or another product qualifier

## MODIFIED Requirements

### Requirement: Customization remains disabled above the 1:1 baseline until acceptance
A1-specific themes, components, commands, and layouts SHALL remain disabled until the complete pinned built-in and extension UI baseline passes source coverage, independent parity, real-prompt integration, and fresh manual acceptance. After acceptance, customization SHALL resolve through versioned A1-owned slots without mutating the baseline implementation or installed Pi code.

#### Scenario: Request customization before parity
- **WHEN** an A1-specific visual or layout customization is requested before 1:1 acceptance
- **THEN** the capability SHALL remain unavailable

#### Scenario: Apply customization after parity
- **WHEN** the accepted baseline receives a supported A1 customization
- **THEN** the customization SHALL resolve through an owned slot and preserve ordinary built-in and extension session behavior

#### Scenario: Reject customization while architecture debt remains
- **WHEN** any source-ledger record names an absent planned destination or stale review status, any visible route can fall back to a generic workflow presenter, any prompt-adjacent row is changed by rendered-string substitution, or production Pi adapters rely on reflection or unchecked type escapes
- **THEN** the customization prerequisite SHALL fail even when visible vanilla parity has been manually accepted

#### Scenario: Validate the customization-ready vanilla baseline
- **WHEN** architecture-debt closure runs
- **THEN** every pinned source unit SHALL identify a real public reuse, host adapter, or present owned port; every approved deviation SHALL remain explicit; engine and component boundaries SHALL use validated typed façades; and shell composition SHALL be split into bounded responsibility modules
- **AND** the untouched-Pi terminal producer, full tests, real integration, packaging, and the accepted manual-baseline invariants SHALL remain unchanged

### Requirement: The declared bare-A1 viewport customizes layout without replacing shell behavior
After the pinned shell baseline and customization prerequisite are accepted, bare A1 SHALL apply the custom session viewport as a declared layout customization over the owned shell's existing engine, transcript components, input surfaces, status/footer components, extension bridge, commands, selectors, dialogs, and lifecycle. The customization SHALL own viewport composition and navigation but SHALL NOT patch installed Pi code, inspect private Pi renderer state, infer transcript semantics from rendered terminal text, or introduce a second agent or terminal authority.

The viewport's intentional differences SHALL be limited to its declared capability: a bounded transcript above a pinned dock, A1 scrollbar presentation, detached/follow navigation, the scroll-to-bottom control, and sticky submitted prompts. Correct text or behavior from an existing shell surface SHALL NOT be reimplemented as viewport-specific status, editor, workflow, or extension behavior.

#### Scenario: Compose the custom viewport
- **WHEN** bare A1 starts after the customization prerequisite is satisfied
- **THEN** the viewport SHALL compose the accepted owned-shell surfaces through their existing public A1 boundaries
- **AND** the docked status, input, footer, commands, modal surfaces, and extension contributions SHALL keep their existing behavior

#### Scenario: Open a pinned workflow from the custom viewport
- **WHEN** the reader invokes a command, selector, dialog, authentication flow, session flow, or extension interaction not declared as replaced
- **THEN** its controller, result, cancellation, focus restoration, and lifecycle SHALL remain the accepted pinned-shell behavior

#### Scenario: Compare an explicit profile
- **WHEN** `a1 pi` is started
- **THEN** the declared viewport layout customization SHALL be absent
- **AND** those profiles SHALL remain suitable for observing the pinned presentation without A1 viewport rows, controls, pinned prompts, or scrollbar settings

#### Scenario: Upgrade the pinned integration
- **WHEN** the pinned Pi or Pi TUI version changes
- **THEN** the viewport SHALL continue to depend only on documented public runtime/component contracts and A1-owned ports
- **AND** an unabsorbed input, layout, or component-boundary change SHALL fail conformance rather than being handled through a private-field or prototype workaround

#### Scenario: Viewport customization is not yet accepted
- **WHEN** its implementation, focused regression evidence, or user-controlled manual acceptance is incomplete or contradicted
- **THEN** the custom viewport milestone SHALL remain unaccepted

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

### Requirement: Graceful user quit returns control to the parent shell
**Reason**: Restated under a new name without its resident-tab, supervisor, launch-guardian, containment, native-host, or timestamp scenarios, which no longer describe the single-agent product.

**Migration**: See the ADDED requirement "Graceful user quit ends the single-agent process and returns control to the parent shell".

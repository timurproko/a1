## MODIFIED Requirements

### Requirement: The owned shell announces an available A1 release in pinned Pi's style

In bare A1 `Update: Notify` SHALL preserve the existing update-available popup exactly: the docked `Update Available` presentation, channel-appropriate manual command, stable changelog link, and session-only close control. It SHALL remain informational and SHALL never start installation. `Update: No` SHALL produce no release-update UI because no startup check runs.

In the default `Auto` mode, the owned shell SHALL NOT render an update-available popup, bordered notice, changelog link, close control, command instruction, or installation progress. After the shared update lifecycle verifies that a newer release is approved and active, every still-running older session that requested or observed that work SHALL show the compact prompt-adjacent status `Update installed, restart to update`. Bare A1 SHALL place the status right-aligned on the same paint-only line immediately above the editor that shows `Copied N chars to clipboard`. The status SHALL use one success-green semantic foreground, SHALL NOT allocate a row, and SHALL NOT move transcript rows, live Working status, dock content, pointer targets, or editor geometry.

A transient copy acknowledgement SHALL replace the restart-ready status on that line for the acknowledgement's existing lifetime. A newer copy acknowledgement SHALL retain its existing replacement and lifetime behavior. When the acknowledgement hides, restart readiness SHALL reappear automatically and remain visible until the older process exits. Working and other live status SHALL retain their existing presentation independently of this overlay. Narrow layouts MAY clip the restart-ready text while preserving the usable editor.

`a1 pi` follows `Auto` and SHALL keep restart readiness in its compact non-transcript status region, using the same exact wording and single success-green foreground. The restart status SHALL take no focus or input and SHALL not be dismissible because it reports that the executing process is older than the active release. Starting a process from the activated release SHALL show no restart status. A failed, skipped, pending, malformed, or unverifiable automatic update SHALL show no release-update UI.

#### Scenario: Announce a stable release
- **WHEN** bare A1 selects `Notify` and startup discovery reports stable release `0.3.1` as newer
- **THEN** the owned UI SHALL render the existing `Update Available` popup with `a1 update`, the stable changelog link, and no automatic installation

#### Scenario: Announce a development release
- **WHEN** bare A1 selects `Notify` and startup discovery reports development release `0.3.1-dev.652` as newer
- **THEN** the owned UI SHALL render the existing popup with `a1 update --develop`, no changelog line, and no automatic installation

#### Scenario: Result arrives after the first frame
- **WHEN** `Notify`-mode discovery or `Auto`-mode verified activation completes after the owned UI is already interactive
- **THEN** the applicable popup or restart-ready status SHALL appear without clearing the editor, moving focus, or interrupting a running turn

#### Scenario: Dock and dismiss in bare A1
- **WHEN** bare A1 in `Notify` mode receives a newer-release result while a turn is running
- **THEN** the existing popup SHALL appear below the transcript and above `Working` without moving transcript rows
- **AND** clicking its `✕` SHALL remove it until the next launch

#### Scenario: Auto installation completes
- **WHEN** bare A1 in `Auto` mode becomes restart-ready while a turn is running
- **THEN** `Update installed, restart to update` SHALL appear in one success-green foreground on the existing right-aligned acknowledgement line above the editor
- **AND** Working SHALL remain in its existing live-status presentation without moving transcript rows or changing editor geometry
- **AND** the restart status SHALL remain for the life of that older process rather than offering a dismiss control

#### Scenario: Copy acknowledgement temporarily replaces restart readiness
- **WHEN** restart readiness is visible and a successful copy produces `Copied N chars to clipboard`
- **THEN** the copy acknowledgement SHALL replace the restart-ready text on the same line for its existing lifetime
- **AND** restart readiness SHALL reappear automatically after the copy acknowledgement hides

#### Scenario: Repeated copy acknowledgement retains priority
- **WHEN** another successful copy occurs before the current copy acknowledgement hides
- **THEN** the newer copy acknowledgement SHALL replace the prior acknowledgement and restart its existing lifetime
- **AND** restart readiness SHALL reappear only after the latest acknowledgement hides

#### Scenario: Both update notices apply
- **WHEN** A1 installation completes while extension-package updates are also available in `a1 pi`
- **THEN** restart readiness SHALL use the compact status region and the extension-package notice SHALL retain its existing transcript presentation
- **AND** no A1 release banner SHALL be inserted before it

#### Scenario: No newer release
- **WHEN** startup discovery is skipped, `No` is selected, or no newer release exists
- **THEN** no A1 release-update status or popup SHALL render

#### Scenario: Explicit update completes in another terminal
- **WHEN** a still-running older `Auto`-mode session observes that an explicit update activated a newer approved release
- **THEN** it SHALL show the same restart-ready status without showing an availability popup

#### Scenario: The terminal is narrow
- **WHEN** the complete restart-ready text cannot fit on the acknowledgement line
- **THEN** the shell SHALL clip it safely without changing editor geometry or hiding the live Working state

#### Scenario: The user restarts
- **WHEN** a new interactive process starts from the activated release
- **THEN** no restart-ready status SHALL render for that release

#### Scenario: Automatic update does not succeed
- **WHEN** an attempt remains pending, fails, or cannot be verified
- **THEN** no A1 release-update status or popup SHALL render

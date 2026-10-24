## MODIFIED Requirements

### Requirement: The owned shell announces an available A1 release in pinned Pi's style

In bare A1 `Update check: Yes` SHALL preserve the existing update-available popup exactly: the docked `Update Available` presentation, channel-appropriate manual command, stable changelog link, and session-only close control. It SHALL remain informational and SHALL never start installation. `Update check: No` SHALL produce no release-update UI because no startup check runs.

In the default `Automatic` mode, the owned shell SHALL NOT render an update-available popup, bordered notice, changelog link, close control, command instruction, or installation progress. After the shared update lifecycle verifies that a newer release is approved and active, every still-running older session that requested or observed that work SHALL show the compact prompt-adjacent status `Update installed · Restart to update`. Bare A1 SHALL place the status in its bottom-aligned transient status region, right-aligned when width permits. When a live working status is also present, working SHALL remain visible on the left and restart readiness SHALL remain visible on the right without moving transcript rows or changing editor geometry. Narrow layouts MAY clip or stack the status while preserving both meanings and the usable editor.

`a1 pi` follows `Automatic` and SHALL use the same compact status region instead of appending update content to the transcript. The restart status SHALL use success/accent semantic colors, take no focus or input, and remain visible for the life of the older process. It SHALL not be dismissible because it reports that the executing process is older than the active release. Starting a process from the activated release SHALL show no restart status. A failed, skipped, pending, malformed, or unverifiable automatic update SHALL show no release-update UI.

#### Scenario: Announce a stable release
- **WHEN** bare A1 selects `Yes` and startup discovery reports stable release `0.3.1` as newer
- **THEN** the owned UI SHALL render the existing `Update Available` popup with `a1 update`, the stable changelog link, and no automatic installation

#### Scenario: Announce a development release
- **WHEN** bare A1 selects `Yes` and startup discovery reports development release `0.3.1-dev.652` as newer
- **THEN** the owned UI SHALL render the existing popup with `a1 update --develop`, no changelog line, and no automatic installation

#### Scenario: Result arrives after the first frame
- **WHEN** `Yes`-mode discovery or `Automatic`-mode verified activation completes after the owned UI is already interactive
- **THEN** the applicable popup or restart-ready status SHALL appear without clearing the editor, moving focus, or interrupting a running turn

#### Scenario: Dock and dismiss in bare A1
- **WHEN** bare A1 in `Yes` mode receives a newer-release result while a turn is running
- **THEN** the existing popup SHALL appear below the transcript and above `Working` without moving transcript rows
- **AND** clicking its `✕` SHALL remove it until the next launch

#### Scenario: Automatic installation completes
- **WHEN** bare A1 in `Automatic` mode becomes restart-ready while a turn is running
- **THEN** working SHALL remain visible on the left and restart readiness SHALL appear on the right without moving transcript rows or changing editor geometry
- **AND** the restart status SHALL remain for the life of that older process rather than offering a dismiss control

#### Scenario: Both update notices apply
- **WHEN** A1 installation completes while extension-package updates are also available in `a1 pi`
- **THEN** restart readiness SHALL use the compact status region and the extension-package notice SHALL retain its existing transcript presentation
- **AND** no A1 release banner SHALL be inserted before it

#### Scenario: No newer release
- **WHEN** startup discovery is skipped, `No` is selected, or no newer release exists
- **THEN** no A1 release-update status or popup SHALL render

#### Scenario: Explicit update completes in another terminal
- **WHEN** a still-running older `Automatic`-mode session observes that an explicit update activated a newer approved release
- **THEN** it SHALL show the same restart-ready status without showing an availability popup

#### Scenario: The terminal is narrow
- **WHEN** the complete working and restart-ready text cannot fit on one row
- **THEN** the shell SHALL clip or stack the transient status without changing editor geometry or losing both semantic states

#### Scenario: The user restarts
- **WHEN** a new interactive process starts from the activated release
- **THEN** no restart-ready status SHALL render for that release

#### Scenario: Automatic update does not succeed
- **WHEN** an attempt remains pending, fails, or cannot be verified
- **THEN** no A1 release-update status or popup SHALL render

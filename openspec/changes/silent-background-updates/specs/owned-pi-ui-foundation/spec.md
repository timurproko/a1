## MODIFIED Requirements

### Requirement: The owned shell announces an available A1 release in pinned Pi's style

The owned shell SHALL NOT render an update-available popup, bordered notice, changelog link, close control, or instruction to run an update command when startup discovery finds a newer A1 release. Discovery and installation progress SHALL remain silent in both interactive profiles.

After the shared update lifecycle verifies that a newer release is approved and active, every still-running older session that requested or observed that work SHALL show the compact prompt-adjacent status `Update installed · Restart to update`. Bare A1 SHALL place the status in its bottom-aligned transient status region, right-aligned when width permits. When a live working status is also present, working SHALL remain visible on the left and restart readiness SHALL remain visible on the right without moving transcript rows or changing editor geometry. Narrow layouts MAY clip or stack the status while preserving both meanings and the usable editor.

`a1 pi` SHALL use the same compact status region instead of appending update content to the transcript. The status SHALL use success/accent semantic colors, take no focus or input, and remain visible for the life of the older process. It SHALL not be dismissible because it reports that the executing process is older than the active release. Starting a process from the activated release SHALL show no restart status. A failed, skipped, pending, malformed, or unverifiable automatic update SHALL show no release-update UI.

#### Scenario: Announce a stable release
- **WHEN** startup discovery reports stable release `0.3.1` as newer
- **THEN** the owned UI SHALL show no `Update Available` banner, changelog, `a1 update` instruction, or update progress while installation is pending
- **AND** after verified activation it SHALL show only `Update installed · Restart to update`

#### Scenario: Announce a development release
- **WHEN** startup discovery reports development release `0.3.1-dev.652` as newer
- **THEN** the owned UI SHALL show no `Update Available` banner or `a1 update --develop` instruction while installation is pending
- **AND** after verified activation it SHALL show the same restart-ready status as a stable release

#### Scenario: Result arrives after the first frame
- **WHEN** the approved active release becomes newer after the owned UI is already interactive
- **THEN** the session SHALL render `Update installed · Restart to update` in the compact prompt-adjacent status region without clearing the editor or moving focus

#### Scenario: Dock and dismiss in bare A1
- **WHEN** bare A1 becomes restart-ready while a turn is running
- **THEN** working SHALL remain visible on the left and restart readiness SHALL appear on the right without moving transcript rows or changing editor geometry
- **AND** the restart status SHALL remain for the life of that older process rather than offering a dismiss control

#### Scenario: Both update notices apply
- **WHEN** A1 installation completes while extension-package updates are also available in `a1 pi`
- **THEN** restart readiness SHALL use the compact status region and the extension-package notice SHALL retain its existing transcript presentation
- **AND** no A1 release banner SHALL be inserted before it

#### Scenario: No newer release
- **WHEN** startup discovery is skipped or reports no newer release
- **THEN** no A1 release-update status or popup SHALL render

#### Scenario: Explicit update completes in another terminal
- **WHEN** a still-running older session observes that an explicit update activated a newer approved release
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

## MODIFIED Requirements

### Requirement: Every package update is one immediate replacement command
The installed application SHALL expose `a1 update` as the stable update command
resolving npm tag `latest`, and `a1 update:develop` as the development-preview
update command resolving the internal npm development dist-tag. Invocation SHALL
authorize stopping verified A1-owned sessions, installing the exact resolved
version, materializing and activating an immutable release, and verifying the
result through one ownership-safe transaction. The command SHALL return to the
invoking shell after reporting its final result and SHALL NOT require manual process
IDs, state deletion, a separate activation operation, or a subsequent bare launch
to finish the update.

#### Scenario: Replace the current preview
- **WHEN** the user runs `a1 update:develop` while an older verified A1 cohort is active
- **THEN** A1 SHALL perform the replacement transaction using the exact development-channel version, report the old and active versions with `develop` terminology, and return to the terminal prompt

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

### Requirement: Installed and channel versions are visible without runtime startup
The installed application SHALL expose `a1 version`. It SHALL report `Installed`,
`Release`, and `Develop` in that order and SHALL NOT start or mutate the interactive
runtime, supervisor, storage, release cohort, or update transaction. Remote channel
discovery SHALL read the authoritative package dist-tags as one coherent registry
result.

#### Scenario: Registry versions are available
- **WHEN** the user runs `a1 version` while npm `latest` and the internal development dist-tag are defined and reachable
- **THEN** A1 SHALL display valid exact semantic versions in the order `Installed`, `Release`, and `Develop`

#### Scenario: Next channel is not defined
- **WHEN** npm metadata is reachable, `latest` is defined, and the package has no development dist-tag
- **THEN** A1 SHALL display the latest version under `Release`, display `Develop: unavailable`, emit no error diagnostic for the absent optional channel, and exit successfully

#### Scenario: Registry is unavailable
- **WHEN** installed package metadata is readable but the package dist-tags query fails
- **THEN** A1 SHALL preserve `Installed`, mark both remote fields unavailable, emit one concise `A1` diagnostic describing the registry failure, and exit successfully

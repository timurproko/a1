## ADDED Requirements

### Requirement: The custom viewport exposes appearance and style settings only
A1 SHALL declare `scrollbarAppearance` and `scrollbarStyle` as live-applicable A1 settings. `scrollbarAppearance` SHALL allow exactly `always`, `hover`, and `hidden`, with `hover` as its default. `scrollbarStyle` SHALL allow exactly `thin` and `thick`, with `thin` as its default. The settings SHALL be stored and resolved through the existing profile-local A1 settings document and SHALL NOT be read from or written to agent settings.

This milestone SHALL NOT declare, display, persist, or infer an A1 scrollbar-speed setting. Appearance and style SHALL affect only the custom bare-A1 viewport and SHALL NOT alter wheel distance or the pinned comparison profiles.

#### Scenario: Resolve defaults
- **WHEN** the active A1 profile has no stored scrollbar values
- **THEN** `scrollbarAppearance` SHALL resolve to `hover`
- **AND** `scrollbarStyle` SHALL resolve to `thin`

#### Scenario: Change appearance live
- **WHEN** the reader changes `scrollbarAppearance` to an allowed value
- **THEN** the running bare-A1 viewport SHALL apply that appearance without restart
- **AND** every surface reading the setting in that session SHALL observe the same value

#### Scenario: Change style live
- **WHEN** the reader changes `scrollbarStyle` to an allowed value
- **THEN** the running bare-A1 viewport SHALL apply that style without restart
- **AND** its scroll position and follow state SHALL remain unchanged

#### Scenario: Persist viewport settings
- **WHEN** either scrollbar setting is accepted and A1 is restarted with the same profile
- **THEN** the accepted value SHALL be restored from that profile's A1 settings document
- **AND** no Pi or agent settings document SHALL be changed by that write

#### Scenario: Inspect the A1 settings section
- **WHEN** the A1 settings section is presented
- **THEN** it SHALL offer the three declared appearance values and the two declared style values
- **AND** it SHALL NOT contain a scrollbar-speed entry

#### Scenario: Use a pinned comparison profile
- **WHEN** `a1 pi` presents its pinned interface
- **THEN** A1's stored scrollbar appearance and style SHALL NOT modify that interface's scrollbar or wheel behavior

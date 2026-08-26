## ADDED Requirements

### Requirement: The custom viewport exposes grouped appearance, style, and speed settings
A1 SHALL declare `scrollbarAppearance`, `scrollbarStyle`, and `scrollbarSpeed` as live-applicable A1 settings grouped under a `Scroll` settings section. The visible row labels SHALL be `Scrollbar mode`, `Scrollbar style`, and `Speed`, without a redundant `A1` section or `(default)` suffix. `scrollbarAppearance` SHALL allow exactly `always`, `hover`, and `hidden`, with `hover` as its default. `scrollbarStyle` SHALL allow exactly `thin` and `thick`, with `thin` as its default. `scrollbarSpeed` SHALL allow exactly `normal`, `fast`, and `high`, in that order, with `normal` as its default. The settings SHALL be stored and resolved through the existing profile-local A1 settings document and SHALL NOT be read from or written to agent settings.

#### Scenario: Resolve defaults
- **WHEN** the active A1 profile has no stored scrollbar values
- **THEN** `scrollbarAppearance` SHALL resolve to `hover`
- **AND** `scrollbarStyle` SHALL resolve to `thin`
- **AND** `scrollbarSpeed` SHALL resolve to `normal`

#### Scenario: Change appearance live
- **WHEN** the reader changes `scrollbarAppearance` to an allowed value
- **THEN** the running bare-A1 viewport SHALL apply that appearance without restart
- **AND** every surface reading the setting in that session SHALL observe the same value

#### Scenario: Change style live
- **WHEN** the reader changes `scrollbarStyle` to an allowed value
- **THEN** the running bare-A1 viewport SHALL apply that style without restart
- **AND** its scroll position and follow state SHALL remain unchanged

#### Scenario: Change speed live
- **WHEN** the reader changes `scrollbarSpeed` to `normal`
- **THEN** each transcript wheel event SHALL move three document rows
- **WHEN** the reader changes it to `fast`
- **THEN** each transcript wheel event SHALL move six document rows without restart
- **AND** selection edge auto-scroll SHALL run twice as fast as `normal`
- **WHEN** the reader changes it to `high`
- **THEN** each transcript wheel event SHALL move twelve document rows without restart
- **AND** selection edge auto-scroll SHALL run twice as fast as `fast`

#### Scenario: Persist viewport settings
- **WHEN** any scrollbar setting is accepted and A1 is restarted with the same profile
- **THEN** the accepted value SHALL be restored from that profile's A1 settings document
- **AND** the same value SHALL survive a fresh repository-local launch instance and rebuilt development candidate
- **AND** future A1-owned settings sections SHALL use the same declaration, resolution, migration, and atomic-store system
- **AND** no Pi or agent settings document SHALL be changed by that write

#### Scenario: Inspect the Scroll settings section
- **WHEN** the owned settings screen is presented
- **THEN** it SHALL offer the declared mode, style, and speed values under `Scroll`
- **AND** those controls SHALL be labeled `Scrollbar mode`, `Scrollbar style`, and `Speed`

#### Scenario: Point at and change settings
- **WHEN** the owned settings screen is open in fullscreen mode
- **THEN** pointer motion over a value SHALL show its hover state
- **AND** clicking an enumerated value SHALL open its dropdown
- **AND** clicking a numeric minus or plus control SHALL apply that step
- **AND** all other settings-screen pointer reports SHALL be consumed without starting terminal text selection

#### Scenario: Use the pinned comparison profile
- **WHEN** `a1 pi` presents its pinned interface
- **THEN** A1's stored scrollbar appearance, style, and speed SHALL NOT modify that interface's scrollbar or wheel behavior

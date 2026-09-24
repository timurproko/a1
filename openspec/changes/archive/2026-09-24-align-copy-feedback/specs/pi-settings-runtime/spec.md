## ADDED Requirements

### Requirement: Fullscreen copy on select reaches the owned frame selection

Bare A1 SHALL treat Pi's `fullscreenCopyOnSelect` as a live shell-owned setting whenever the custom fullscreen frame-selection owner is active. The initial effective value SHALL be read from Pi's settings manager before selection input is handled. An accepted live change SHALL update release-time copy behavior before the settings operation reports success, without clearing an existing selection or changing explicit selection-copy behavior. A product mode without the owned fullscreen selection effect SHALL NOT claim that this integration applied the setting.

#### Scenario: Start with automatic copy enabled
- **WHEN** Pi's effective `fullscreenCopyOnSelect` value is `true` as bare A1 starts
- **THEN** the first completed nonempty frame drag SHALL submit its selected text automatically

#### Scenario: Start with automatic copy disabled
- **WHEN** Pi's effective `fullscreenCopyOnSelect` value is `false` as bare A1 starts
- **THEN** the first completed frame drag SHALL retain its selection without automatic clipboard submission
- **AND** explicit selection copy SHALL remain available

#### Scenario: Change the setting live
- **WHEN** the reader changes `fullscreenCopyOnSelect` during an active bare-A1 session
- **THEN** the next completed frame drag SHALL use the new value without restart or reload
- **AND** the settings operation SHALL report success only after the selection owner has accepted that value

#### Scenario: Use a profile without the owned selection effect
- **WHEN** the active product mode delegates fullscreen selection to pinned Pi or the terminal
- **THEN** A1 SHALL leave that profile's existing selection and setting lifecycle unchanged
- **AND** it SHALL NOT install bare-A1 automatic-copy routing there

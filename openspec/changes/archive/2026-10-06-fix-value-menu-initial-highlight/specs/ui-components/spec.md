## MODIFIED Requirements

### Requirement: A value menu opens against the row it was opened from
The component layer SHALL provide a menu of offered values that opens anchored to the row it was
opened from and SHALL keep that anchor while it is open, even when the selection or the pointer moves.
It SHALL open above its anchor when there is not room below. It SHALL mark the value in effect. It
SHALL highlight nothing until the pointer or a key picks an entry, so opening it does not flash a
highlight the reader did not ask for. The pointer press that opens the menu from its anchor SHALL NOT
itself count as picking a menu entry. A press outside it SHALL close it.

#### Scenario: Open near the bottom of the screen
- **WHEN** a menu is opened from a row with fewer rows below it than the menu needs
- **THEN** the menu SHALL be placed above its anchor

#### Scenario: Open a menu
- **WHEN** a menu opens
- **THEN** the value in effect SHALL be marked and no entry SHALL be highlighted

#### Scenario: Enter a pointer-opened menu
- **WHEN** a pointer press opens a menu from its anchor and subsequent pointer motion reaches an entry
- **THEN** no entry SHALL be highlighted before that motion reaches the menu
- **AND** the reached entry SHALL become highlighted

#### Scenario: Press outside the menu
- **WHEN** a press lands outside the open menu
- **THEN** the menu SHALL close and the press SHALL NOT act on what is behind it

# Spec Delta

## MODIFIED Requirements

### Requirement: A value menu opens against the row it was opened from
The component layer SHALL provide a menu of offered values that opens anchored to the row it was
opened from and SHALL keep that anchor while it is open, even when the selection or the pointer moves.
It SHALL open above its anchor when there is not room below. It SHALL mark the value in effect independently of its active entry. A pointer-opened menu SHALL highlight nothing until subsequent pointer motion or a navigation key picks an entry, so the opening press does not flash a highlight the reader did not ask for. A keyboard-opened menu MAY request an initial active entry, which SHALL be highlighted as soon as the menu opens. A press outside the menu SHALL close it.

#### Scenario: Open near the bottom of the screen
- **WHEN** a menu is opened from a row with fewer rows below it than the menu needs
- **THEN** the menu SHALL be placed above its anchor

#### Scenario: Open a menu
- **WHEN** a pointer press opens a menu from its anchor
- **THEN** the value in effect SHALL be marked and no entry SHALL be highlighted

#### Scenario: Open a menu with an initial keyboard choice
- **WHEN** a keyboard action opens a menu and requests an initial active entry
- **THEN** that entry SHALL be highlighted immediately
- **AND** the value in effect SHALL remain marked independently

#### Scenario: Enter a pointer-opened menu
- **WHEN** a pointer press opens a menu from its anchor and subsequent pointer motion reaches an entry
- **THEN** no entry SHALL be highlighted before that motion reaches the menu
- **AND** the reached entry SHALL become highlighted

#### Scenario: Press outside the menu
- **WHEN** a press lands outside the open menu
- **THEN** the menu SHALL close and the press SHALL NOT act on what is behind it

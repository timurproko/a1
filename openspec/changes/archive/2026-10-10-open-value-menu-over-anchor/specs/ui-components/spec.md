# Spec Delta

## MODIFIED Requirements

### Requirement: A value menu opens against the row it was opened from
The component layer SHALL provide a menu of offered values that opens anchored to the row it was
opened from and SHALL keep that anchor while it is open, even when the selection or the pointer moves.
It SHALL lay its value in effect over the anchor row, so that value stays where it was read, and SHALL shift only as far as needed to stay inside the body. It SHALL mark the value in effect independently of its active entry. A pointer-opened menu SHALL highlight the value in effect as soon as it opens, since that entry lies under the pointer that opened it. A keyboard-opened menu MAY request an initial active entry, which SHALL be highlighted as soon as the menu opens. A press outside the menu SHALL close it.

#### Scenario: Open over the anchor
- **WHEN** a menu is opened from a row
- **THEN** the entry for the value in effect SHALL occupy the anchor row, with earlier entries above it and later entries below it

#### Scenario: Open near the bottom of the screen
- **WHEN** a menu opened over its anchor would run past the bottom of the body
- **THEN** the menu SHALL be shifted up just far enough to fit inside the body, without crossing its top

#### Scenario: Open a menu
- **WHEN** a pointer press opens a menu from its anchor
- **THEN** the value in effect SHALL be marked and highlighted under the pointer

#### Scenario: Open a menu with an initial keyboard choice
- **WHEN** a keyboard action opens a menu and requests an initial active entry
- **THEN** that entry SHALL be highlighted immediately
- **AND** the value in effect SHALL remain marked independently

#### Scenario: Enter a pointer-opened menu
- **WHEN** a pointer press opens a menu from its anchor and subsequent pointer motion reaches another entry
- **THEN** the reached entry SHALL become highlighted

#### Scenario: Press outside the menu
- **WHEN** a press lands outside the open menu
- **THEN** the menu SHALL close and the press SHALL NOT act on what is behind it

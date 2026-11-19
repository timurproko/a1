## ADDED Requirements

### Requirement: Wheel axes remain distinct
A1 SHALL decode SGR vertical wheel reports as vertical wheel events and SHALL NOT reinterpret horizontal wheel reports as vertical movement. Unsupported horizontal wheel reports SHALL be removed from owned pointer input without becoming keyboard input.

#### Scenario: Decode vertical wheel input
- **WHEN** the terminal reports a vertical wheel-up or wheel-down action
- **THEN** A1 SHALL emit the matching vertical wheel event with the reported pointer position

#### Scenario: Receive horizontal wheel input
- **WHEN** the terminal reports a horizontal wheel-left or wheel-right action
- **THEN** A1 SHALL NOT emit a vertical wheel event
- **AND** the report SHALL NOT be delivered as typed or navigational keyboard input

#### Scenario: Receive mixed touchpad reports
- **WHEN** one input chunk contains vertical wheel reports, horizontal wheel reports, and keyboard text
- **THEN** A1 SHALL preserve the order and direction of the vertical wheel events
- **AND** SHALL preserve the keyboard text while safely discarding the horizontal wheel reports

## MODIFIED Requirements

### Requirement: Pointer reporting is enabled only while a screen needs it
A1 SHALL enable terminal mouse reporting only while a screen that uses pointer input is
presented, and SHALL disable it and restore the terminal when that screen closes, including
when it closes through a failure. Enabling and disabling SHALL be paired so a terminal is
never left reporting after A1 stops using it.

Pairing SHALL hold on every path that ends the screen's presentation, not only the path the
screen itself takes to close. Session shutdown, session replacement, and disposal of the
surface that presented the screen SHALL each disable reporting. While no such screen is
presented, the physical terminal SHALL retain its own wheel scrolling and text selection.

#### Scenario: Present and close a pointer-driven screen
- **WHEN** such a screen is presented and later closed
- **THEN** reporting SHALL be enabled on presentation and disabled on close, leaving the
  terminal as it was found

#### Scenario: Screen closes through a failure
- **WHEN** the screen closes because it failed
- **THEN** reporting SHALL still be disabled and the terminal restored

#### Scenario: Session ends while the screen is presented
- **WHEN** the session shuts down, is replaced, or disposes its surfaces while such a screen
  is presented
- **THEN** reporting SHALL be disabled as part of that teardown

#### Scenario: Terminal is used after A1 stops presenting the screen
- **WHEN** the user scrolls with the wheel or selects text once no pointer-driven screen is
  presented
- **THEN** the terminal's own scrolling and selection SHALL work

#### Scenario: No such screen is presented
- **WHEN** no screen using pointer input is presented
- **THEN** reporting SHALL remain disabled

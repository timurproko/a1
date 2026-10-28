## REMOVED Requirements

### Requirement: A dialog panel edits a value at the foot of the screen
The component layer SHALL provide a panel that presents one value's parts at the foot of the screen,
over the surface it was opened from, ruled off above and below. It SHALL show every part it offers
with the one in hand marked, a description of that part, and how to change it. It SHALL answer from
the values it is editing rather than from the snapshot it was opened with, so a change it makes is
visible in it and the next change steps from what is shown. Opening it SHALL clear any hover on the
surface behind it, and while it is open it SHALL own the pointer.

#### Scenario: Change a value in the panel
- **WHEN** a part is changed from inside the panel
- **THEN** the panel SHALL show the new value
- **AND** a further change SHALL step from the value shown

#### Scenario: Open the panel
- **WHEN** the panel opens
- **THEN** the row it was opened from SHALL stop reading as pointed at
- **AND** pointer input SHALL be consumed by the panel

## ADDED Requirements

### Requirement: A configure dialog edits a structured value in a centered modal

The component layer SHALL provide one configure-modal frame that presents a structured value's parts on a centered floating surface over the screen that opened it. The frame SHALL dim the complete backdrop, restore full intensity inside the modal, fill every modal cell with the declared panel background, use the established compact dialog width when space permits, and preserve the requested terminal row and column dimensions. It SHALL compose ANSI-styled source rows without counting style bytes as visible width, leaking backdrop intensity into the panel, or clearing backdrop dimming after the panel.

The modal SHALL show every part it offers with the one in hand marked, a description of that part, and the semantic shortcut guidance for changing it. It SHALL answer from the values it is editing rather than from the snapshot it was opened with, so a change it makes is visible in it and the next change steps from what is shown. Opening it SHALL clear any hover on the surface behind it, and while it is open it SHALL own the pointer according to the consuming screen's dialog policy. Compact terminal layouts SHALL reduce the visible choice window before removing the title, active control, or shortcut guidance.

#### Scenario: Open a configure modal

- **WHEN** a structured value opens its configure dialog
- **THEN** the source screen SHALL remain visible at reduced intensity behind a centered panel-background surface
- **AND** the modal title, description, active control, rows, and shortcut guidance SHALL render at normal intensity inside that surface

#### Scenario: Change a value in the modal

- **WHEN** a part is changed from inside the modal
- **THEN** the modal SHALL show the new value
- **AND** a further change SHALL step from the value shown

#### Scenario: Render a compact configure modal

- **WHEN** the available rows or columns are smaller than the preferred configure-modal geometry
- **THEN** the modal SHALL remain within the requested frame and retain its title, active control, selected choice, and shortcut guidance
- **AND** no ANSI style sequence or wide grapheme SHALL be split at an overlay boundary

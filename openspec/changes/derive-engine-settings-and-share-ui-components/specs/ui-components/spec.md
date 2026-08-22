## ADDED Requirements

### Requirement: A value list presents rows with an aligned value column and pointer regions
The component layer SHALL provide a list view for rows that carry a label and a value. It SHALL align
every value to one column computed from the widest label it shows, and it SHALL resolve a pointer
position into a declared region of the row — its label, its value, or a control beside the value —
so a screen acts on where the pointer is rather than on the row as a whole. Pointing at a label SHALL
select without changing, and pointing at a value SHALL be what acts. Selection and hover SHALL be
distinct: the keyboard's selection SHALL NOT move because the pointer moved.

#### Scenario: Point at a row
- **WHEN** the pointer rests on a row
- **THEN** the region under it SHALL be reported as the label, the value, or a control
- **AND** the row SHALL read as pointed at without becoming the keyboard's selection

#### Scenario: Act on a row
- **WHEN** the pointer presses the label
- **THEN** the row SHALL be selected and its value SHALL NOT change

#### Scenario: Align values
- **WHEN** rows of differing label widths are shown together
- **THEN** every value SHALL begin at the same column

### Requirement: A value menu opens against the row it was opened from
The component layer SHALL provide a menu of offered values that opens anchored to the row it was
opened from and SHALL keep that anchor while it is open, even when the selection or the pointer moves.
It SHALL open above its anchor when there is not room below. It SHALL mark the value in effect. It
SHALL highlight nothing until the pointer or a key picks an entry, so opening it does not flash a
highlight the reader did not ask for. A press outside it SHALL close it.

#### Scenario: Open near the bottom of the screen
- **WHEN** a menu is opened from a row with fewer rows below it than the menu needs
- **THEN** the menu SHALL be placed above its anchor

#### Scenario: Open a menu
- **WHEN** a menu opens
- **THEN** the value in effect SHALL be marked and no entry SHALL be highlighted

#### Scenario: Press outside the menu
- **WHEN** a press lands outside the open menu
- **THEN** the menu SHALL close and the press SHALL NOT act on what is behind it

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

### Requirement: A bounded control offers only the values its range allows
The component layer SHALL provide a control for stepping a value through a declared range or through
a declared list of values. It SHALL take a step only where one exists, and at either end the control
for going further SHALL be drawn in the unavailable role and SHALL do nothing. It SHALL appear over
the value it belongs to rather than anywhere on the row.

#### Scenario: Step at the end of a range
- **WHEN** the value is at the end of its range and the control for going further is used
- **THEN** nothing SHALL be written and no message SHALL be emitted

#### Scenario: Show the control
- **WHEN** the pointer rests on the value
- **THEN** the control SHALL appear beside it without shifting the value's column

### Requirement: An input row and a status line are components
The component layer SHALL provide the input row a screen uses for search and inline editing — a
prompt, the text, a block caret over the cell it is on, and a quiet placeholder while empty — and the
status line a screen uses to say one thing at a time. A screen SHALL NOT compose either from escapes
of its own.

#### Scenario: Render an empty input row
- **WHEN** the input row is shown with no text
- **THEN** the placeholder SHALL be shown quietly with the caret over its first cell

#### Scenario: Report something on the status line
- **WHEN** a screen has both a standing hint and something to report
- **THEN** the status line SHALL show what is reported until it is superseded

### Requirement: The theme declares a role for a control that cannot be used
The theme SHALL declare a role for an unavailable control, distinct from quiet text, so a component
draws one by naming that role. A component SHALL NOT express unavailability with an escape sequence
written where it is used.

#### Scenario: Draw an unavailable control
- **WHEN** a component draws a control that cannot act
- **THEN** it SHALL name the unavailable role
- **AND** the drawn control SHALL read as quieter than quiet text in the theme in use

## MODIFIED Requirements

### Requirement: One scrollbar serves every scrollable surface
A1 SHALL provide one scrollbar with declared geometry derived from content length, viewport height, scroll position, and track height. Each scrollable surface SHALL identify its own rail so two surfaces cannot share activity, hover, or drag state. The scrollbar SHALL support pointer hover, thumb drag, and track paging. `auto` and `always` SHALL reserve the final rail cell even while content fits so later visibility does not reflow content; `hidden` SHALL reserve no rail cell.

For overflowing content, the shared scrollbar SHALL accept an appearance of `auto`, `always`, or `hidden` and a style of `thin` or `thick`. Its thumb SHALL remain at least two rows tall whenever the track has two or more rows, SHALL remain bounded to shorter tracks, and SHALL retain proportional sizing when that produces a larger thumb. `always` SHALL draw the rail whenever content overflows. `auto` SHALL draw it while its pointer zone is active, while its thumb is being dragged, and for a bounded linger after that rail scrolls; it SHALL keep the same rail column reserved while temporarily invisible. `hidden` SHALL draw no rail, reserve no rail column, and expose no interactive thumb or track. The track SHALL remain a connected dim `│` hairline. The selected style SHALL change the thumb from the accent `│` used by `thin` to the centered accent `┃` used by `thick`, without changing geometry or hit targets. A pointed-at or dragged thin thumb MAY temporarily use `┃` as its interaction emphasis. Track, thumb, hover, and drag emphasis SHALL use declared theme roles rather than literal terminal colors.

The shared scrollbar SHALL accept a speed of `normal`, `fast`, or `high`. Normal SHALL map one wheel event to three lines, fast to six lines, and high to nine lines. Appearance and style SHALL NOT change that selected wheel distance.

#### Scenario: Content fits the viewport
- **WHEN** content is no longer than the viewport
- **THEN** no scrollbar SHALL be drawn
- **AND** `auto` or `always` SHALL retain the final rail cell while `hidden` SHALL return it to content

#### Scenario: Derive thumb geometry
- **WHEN** content is longer than the viewport and the track has at least two rows
- **THEN** the thumb size and position SHALL follow the scroll position, and the thumb SHALL remain at least two rows tall and stay within the track

#### Scenario: Bound a thumb to a one-row track
- **WHEN** overflowing content is rendered with a one-row track
- **THEN** the thumb SHALL occupy that one row without exceeding the track

#### Scenario: Draw an always-visible rail
- **WHEN** content overflows and appearance is `always`
- **THEN** the track and thumb SHALL be drawn without requiring pointer or scroll activity

#### Scenario: Reveal an automatic rail
- **WHEN** content overflows, appearance is `auto`, and the pointer enters that rail's zone or that rail scrolls
- **THEN** the rail SHALL be drawn
- **AND** its reserved column SHALL be the same before, during, and after temporary visibility

#### Scenario: Linger after activity
- **WHEN** an automatic rail was revealed by scrolling and receives no further activity
- **THEN** it SHALL remain visible for the bounded linger and then disappear
- **AND** the transcript or pane content SHALL NOT rewrap when it disappears

#### Scenario: Hold visibility while dragging
- **WHEN** an automatic rail's thumb is being dragged and the pointer leaves its ordinary hover zone
- **THEN** that rail SHALL remain visible until the drag ends

#### Scenario: Hide a rail
- **WHEN** content overflows and appearance is `hidden`
- **THEN** no track or thumb SHALL be drawn, no rail column SHALL be reserved, and pointer input in that former region SHALL NOT begin scrollbar interaction

#### Scenario: Select thin or thick style
- **WHEN** the scrollbar style changes between `thin` and `thick`
- **THEN** the thumb SHALL use `│` for thin or `┃` for thick while the track remains `│`
- **AND** thumb geometry, scroll position, track paging, and pointer hit regions SHALL remain unchanged

#### Scenario: Drag the thumb
- **WHEN** the pointer presses the thumb and moves
- **THEN** the scroll position SHALL follow the pointer, and SHALL clamp at both ends without wrapping

#### Scenario: Page on the track
- **WHEN** the pointer activates the track above or below the thumb
- **THEN** the scroll position SHALL move one viewport page in that direction and clamp at the corresponding edge

#### Scenario: Two rails on screen
- **WHEN** two scrollable surfaces are visible and the pointer is over or scrolling one rail
- **THEN** only that rail SHALL report activity or hover, and dragging it SHALL NOT scroll or reveal the other

#### Scenario: Use normal wheel speed
- **WHEN** scrollbar speed is `normal`
- **THEN** one wheel event SHALL request three lines in its direction

#### Scenario: Use high wheel speed
- **WHEN** scrollbar speed is `high`
- **THEN** one wheel event SHALL request nine lines in its direction

#### Scenario: Appearance and style do not set wheel speed
- **WHEN** appearance or style changes
- **THEN** the wheel distance selected by `scrollbarSpeed` SHALL remain unchanged

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

The shared component theme boundary SHALL own the canonical floating-dialog surface palette rather than requiring a consuming route or individual dialog to embed a background sequence. The dark palette SHALL match the native Commands and Plus Menu surface: RGB `38,38,38` in truecolor mode and ANSI color `235` in 256-color mode. The renderer SHALL reset the background after its span, while selected rows continue to use the active semantic selection background.

The modal SHALL show every part it offers with the one in hand marked, a description of that part, and the semantic shortcut guidance for changing it. The active row's selection background SHALL fill the modal's content width as it does in the reference Plus Menu while the modal's outer padding retains the panel background. It SHALL answer from the values it is editing rather than from the snapshot it was opened with, so a change it makes is visible in it and the next change steps from what is shown. Opening it SHALL clear any hover on the surface behind it, and while it is open it SHALL own the pointer according to the consuming screen's dialog policy. Compact terminal layouts SHALL reduce the visible choice window before removing the title, active control, or shortcut guidance.

#### Scenario: Open a configure modal

- **WHEN** a structured value opens its configure dialog
- **THEN** the source screen SHALL remain visible at reduced intensity behind a centered panel-background surface
- **AND** the modal title, description, active control, rows, and shortcut guidance SHALL render at normal intensity inside that surface

#### Scenario: Match the native dialog surface palette

- **WHEN** a centered configure modal renders in truecolor or 256-color mode
- **THEN** every non-selected panel cell SHALL use the shared native-matching surface background for that mode
- **AND** selected rows SHALL restore the panel background in their outer padding after the selection span ends
- **AND** the consuming route and dialog SHALL NOT declare their own panel RGB or ANSI index

#### Scenario: Change a value in the modal

- **WHEN** a part is changed from inside the modal
- **THEN** the modal SHALL show the new value
- **AND** a further change SHALL step from the value shown

#### Scenario: Render a compact configure modal

- **WHEN** the available rows or columns are smaller than the preferred configure-modal geometry
- **THEN** the modal SHALL remain within the requested frame and retain its title, active control, selected choice, and shortcut guidance
- **AND** no ANSI style sequence or wide grapheme SHALL be split at an overlay boundary

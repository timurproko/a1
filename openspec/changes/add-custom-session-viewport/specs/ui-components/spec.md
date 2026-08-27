## MODIFIED Requirements

### Requirement: One scrollbar serves every scrollable surface
A1 SHALL provide one scrollbar with declared geometry derived from content length, viewport height, scroll position, and track height. Each scrollable surface SHALL identify its own rail so two surfaces cannot share activity, hover, or drag state. The scrollbar SHALL support pointer hover, thumb drag, and track paging, and SHALL reserve no space when the content fits.

For overflowing content, the shared scrollbar SHALL accept an appearance of `always`, `hover`, or `hidden` and a style of `thin` or `thick`. `always` SHALL draw the rail whenever content overflows. `hover` SHALL draw it while its pointer zone is active, while its thumb is being dragged, and for a bounded linger after that rail scrolls; it SHALL keep the same rail column reserved while temporarily invisible so appearing does not reflow content. `hidden` SHALL draw no rail, reserve no rail column, and expose no interactive thumb or track. The track SHALL remain a connected dim `│` hairline. The selected style SHALL change the thumb from the accent `│` used by `thin` to the centered accent `┃` used by `thick`, without changing geometry or hit targets. A pointed-at or dragged thin thumb MAY temporarily use `┃` as its interaction emphasis. Track, thumb, hover, and drag emphasis SHALL use declared theme roles rather than literal terminal colors.

The shared scrollbar SHALL accept a speed of `normal`, `fast`, or `high`. Normal SHALL map one wheel event to three lines, fast to six lines, and high to nine lines. Appearance and style SHALL NOT change that selected wheel distance.

#### Scenario: Content fits the viewport
- **WHEN** content is no longer than the viewport
- **THEN** no scrollbar SHALL be drawn and no width SHALL be reserved for it

#### Scenario: Derive thumb geometry
- **WHEN** content is longer than the viewport
- **THEN** the thumb size and position SHALL follow the scroll position, and the thumb SHALL remain at least one row tall and stay within the track

#### Scenario: Draw an always-visible rail
- **WHEN** content overflows and appearance is `always`
- **THEN** the track and thumb SHALL be drawn without requiring pointer or scroll activity

#### Scenario: Reveal a hover rail
- **WHEN** content overflows, appearance is `hover`, and the pointer enters that rail's zone or that rail scrolls
- **THEN** the rail SHALL be drawn
- **AND** its reserved column SHALL be the same before, during, and after temporary visibility

#### Scenario: Linger after activity
- **WHEN** a hover rail was revealed by scrolling and receives no further activity
- **THEN** it SHALL remain visible for the bounded linger and then disappear
- **AND** the transcript or pane content SHALL NOT rewrap when it disappears

#### Scenario: Hold visibility while dragging
- **WHEN** a hover rail's thumb is being dragged and the pointer leaves its ordinary hover zone
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
- **THEN** one wheel event SHALL request six lines in its direction

#### Scenario: Appearance and style do not set wheel speed
- **WHEN** appearance or style changes
- **THEN** the wheel distance selected by `scrollbarSpeed` SHALL remain unchanged

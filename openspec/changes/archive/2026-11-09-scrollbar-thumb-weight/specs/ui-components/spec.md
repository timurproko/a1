## MODIFIED Requirements

### Requirement: One scrollbar serves every scrollable surface
A1 SHALL provide one scrollbar with declared geometry derived from content length, viewport height, scroll position, and track height. Each scrollable surface SHALL identify its own rail so two surfaces cannot share activity, hover, or drag state. The scrollbar SHALL support pointer hover, thumb drag, and track paging. `auto` and `always` SHALL reserve the final rail cell even while content fits so later visibility does not reflow content; `hidden` SHALL reserve no rail cell.

For overflowing content, the shared scrollbar SHALL accept an appearance of `auto`, `always`, or `hidden` and a style of `thin` or `thick`. Its thumb SHALL remain at least two rows tall whenever the track has two or more rows, SHALL remain bounded to shorter tracks, and SHALL retain proportional sizing when that produces a larger thumb. `always` SHALL draw the rail whenever content overflows. `auto` SHALL draw it while its pointer zone is active, while its thumb is being dragged, and for a bounded linger after that rail scrolls; it SHALL keep the same rail column reserved while temporarily invisible. `hidden` SHALL draw no rail, reserve no rail column, and expose no interactive thumb or track. Thin SHALL use `┃` for both track and thumb; thick SHALL use `▐` for both. Both glyphs SHALL occupy one terminal column without changing geometry or hit targets. The track SHALL use the dim theme role and the thumb SHALL use the accent theme role. Hover and drag SHALL retain the selected style's glyph rather than substitute the other style. Track, thumb, hover, and drag emphasis SHALL use declared theme roles rather than literal terminal colors. A shared rail drawn without an explicit presentation SHALL use the thin glyphs.

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
- **THEN** both track and thumb SHALL use `┃` for thin or `▐` for thick, with dim track and accent thumb theme roles
- **AND** thumb geometry, scroll position, track paging, and pointer hit regions SHALL remain unchanged

#### Scenario: Hover or drag either style
- **WHEN** a thin or thick rail is hovered or its thumb is dragged
- **THEN** the rail SHALL retain its selected glyph and accent thumb over a dim track
- **AND** automatic visibility SHALL follow the existing hover and drag policy

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

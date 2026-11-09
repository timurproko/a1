## MODIFIED Requirements

### Requirement: The settings list scrollbar follows the shared scrollbar settings
The owned settings screen SHALL present its list scrollbar through the shared scrollbar presentation policy using the currently effective `scrollbarAppearance` and `scrollbarStyle`, including an accepted live value pending source reflection, rather than drawing a rail whenever the list overflows. Under `always` the rail SHALL be drawn whenever the list overflows. Under `auto` the rail SHALL be drawn while the list scrolls and for the transcript's linger afterwards, or while the pointer is over the rail or dragging its thumb, and SHALL fade on its own once the linger passes. Under `hidden` no rail SHALL be drawn and no rail column SHALL be reserved. Under `auto` and `always` the rail column SHALL remain reserved while the list fits, so revealing the rail does not reflow the rows. Thin SHALL use the shared `┃` glyph for track and thumb, and thick SHALL use the shared `▐` glyph for track and thumb. Hover and drag SHALL retain the selected style. Tracks SHALL remain dim and thumbs accent-colored through the declared theme roles.

The settings rail SHALL own pointer reports inside its hit region: pointer motion SHALL update rail hover, pressing the thumb and moving SHALL scroll the list with the thumb, and pressing the track above or below the thumb SHALL page in that direction. Rail hover SHALL NOT set a row hover state. The whole-pane wheel ownership, the structured dialog, and the value menu SHALL keep their existing pointer precedence.

#### Scenario: Overflow under auto without a pointer
- **WHEN** `scrollbarAppearance` resolves to `auto`, the list overflows, it has not scrolled within the linger, and no pointer is over the rail
- **THEN** the rail column SHALL be reserved and blank
- **AND** no track or thumb glyph SHALL be drawn

#### Scenario: Scroll under auto
- **WHEN** the list scrolls under `auto` by wheel, drag, track page, keyboard jump, or a search that resets the position
- **THEN** the next frame SHALL draw the track and thumb
- **AND** the rail SHALL stay drawn for the shared linger and then be blanked by a repaint the screen requests itself

#### Scenario: Hover the rail under auto
- **WHEN** the list overflows under `auto` and the pointer moves onto the rail column within the track
- **THEN** the next frame SHALL draw the dim track and accent thumb using the selected style's glyph
- **AND** moving the pointer off the rail SHALL blank the rail again

#### Scenario: Overflow under always
- **WHEN** `scrollbarAppearance` resolves to `always` and the list overflows
- **THEN** the rail SHALL be drawn with the thin glyph for `thin` and the thick glyph for `thick`
- **AND** it SHALL remain drawn without pointer activity

#### Scenario: Hide the rail
- **WHEN** `scrollbarAppearance` resolves to `hidden` and the list overflows
- **THEN** no rail SHALL be drawn and the rows SHALL use the full pane width
- **AND** pointer reports at the former rail column SHALL be handled as ordinary list reports

#### Scenario: Change the mode on the settings screen
- **WHEN** the reader changes `Scrollbar mode` or `Scrollbar style` on the settings screen
- **THEN** the settings rail SHALL follow the accepted value on the next frame, before the store reflects it
- **AND** the transcript SHALL observe the same value through its existing live application

#### Scenario: Drag the thumb
- **WHEN** the reader presses the thumb and moves the pointer along the rail
- **THEN** the list SHALL scroll to the position the thumb row denotes, keeping the grab offset
- **AND** releasing the pointer SHALL end the drag without changing the selection

#### Scenario: Page from the track
- **WHEN** the reader presses the rail track above or below the thumb
- **THEN** the list SHALL scroll by the rows in view in that direction, clamped to the list extent

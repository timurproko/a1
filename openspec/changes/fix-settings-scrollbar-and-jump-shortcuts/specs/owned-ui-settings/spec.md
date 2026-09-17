## ADDED Requirements

### Requirement: The settings list scrollbar follows the shared scrollbar settings
The owned settings screen SHALL present its list scrollbar through the shared scrollbar presentation policy using the currently effective `scrollbarAppearance` and `scrollbarStyle`, including an accepted live value pending source reflection, rather than drawing a rail whenever the list overflows. Under `always` the rail SHALL be drawn whenever the list overflows. Under `auto` the rail SHALL be drawn only while the pointer is over the rail or dragging its thumb. Under `hidden` no rail SHALL be drawn and no rail column SHALL be reserved. Under `auto` and `always` the rail column SHALL remain reserved while the list fits, so revealing the rail does not reflow the rows. `thick`, a hovered thumb, and a dragged thumb SHALL use the shared thick glyph.

The settings rail SHALL own pointer reports inside its hit region: pointer motion SHALL update rail hover, pressing the thumb and moving SHALL scroll the list with the thumb, and pressing the track above or below the thumb SHALL page in that direction. Rail hover SHALL NOT set a row hover state. The whole-pane wheel ownership, the structured dialog, and the value menu SHALL keep their existing pointer precedence.

#### Scenario: Overflow under auto without a pointer
- **WHEN** `scrollbarAppearance` resolves to `auto`, the list overflows, and no pointer is over the rail
- **THEN** the rail column SHALL be reserved and blank
- **AND** no track or thumb glyph SHALL be drawn

#### Scenario: Hover the rail under auto
- **WHEN** `scrollbarAppearance` resolves to `auto`, the list overflows, and the pointer moves onto the rail column within the track
- **THEN** the next frame SHALL draw the track and a thick thumb
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
- **THEN** the list SHALL scroll one body height in that direction, clamped to the list extent

### Requirement: Settings boundary jumps use the content-boundary chords
The owned settings screen SHALL jump to the first setting on `Ctrl+Home` and to the last setting on `Ctrl+End`, in the list and while searching, matching the bare-A1 transcript's content-boundary chords. Unmodified `Home` and `End` SHALL NOT move the settings selection: in the list they SHALL be ignored, and while searching they SHALL move the search input's cursor to its start and end through the shared line input. The shortcut declarations SHALL name `ctrl+home` and `ctrl+end` for these actions so listings and the status bar derive from the effective bindings. The xterm modifier and rxvt Ctrl encodings of both chords SHALL produce the same action.

#### Scenario: Jump in the list
- **WHEN** the list has focus and the reader presses `Ctrl+Home` or `Ctrl+End`
- **THEN** the selection SHALL move to the first or the very last setting respectively
- **AND** `Ctrl+Home` SHALL restore the list's opening scroll position

#### Scenario: Jump while searching
- **WHEN** search is open with results and the reader presses `Ctrl+Home` or `Ctrl+End`
- **THEN** the selection SHALL move to the first or last result respectively
- **AND** the search text and cursor SHALL remain unchanged

#### Scenario: Move the search cursor
- **WHEN** search is open and the reader presses `Home` or `End`
- **THEN** the search input's cursor SHALL move to its start or end respectively
- **AND** the selection and scroll position SHALL remain unchanged

#### Scenario: Unmodified keys in the list
- **WHEN** the list has focus and the reader presses `Home` or `End`
- **THEN** the selection and scroll position SHALL remain unchanged

#### Scenario: Decode equivalent terminal reports
- **WHEN** a terminal delivers the xterm modifier or rxvt Ctrl encoding of `Ctrl+Home` or `Ctrl+End`
- **THEN** the settings screen SHALL perform the same boundary jump

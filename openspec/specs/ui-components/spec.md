# ui-components Specification

## Purpose
Defines the rendering and composition primitives every A1-owned screen is built from: the
invalidation and frame contracts, display-width-correct text measurement, the scrollbar, the pane
contract, and the reusable panes for grouped lists and single-line input.

## Requirements

### Requirement: A pane renders exactly the rectangle it is given
A pane SHALL render into a declared rectangle and SHALL emit exactly that many rows, each occupying
at most that many display columns. A pane SHALL NOT emit an embedded newline inside a rendered row,
because the host counts rows to place everything below it. A1 SHALL validate a rendered frame against
its rectangle and SHALL report the offending pane rather than allowing a malformed frame to corrupt
the surrounding layout.

#### Scenario: Render a pane
- **WHEN** a pane is rendered for a rectangle of a given width and height
- **THEN** it SHALL return exactly that many rows, each within that width

#### Scenario: Content is shorter than the rectangle
- **WHEN** a pane has less content than its height
- **THEN** the remaining rows SHALL be emitted as blank rows rather than omitted

#### Scenario: Emit a malformed frame
- **WHEN** a pane emits the wrong row count, an over-wide row, or a row containing a newline
- **THEN** frame validation SHALL fail and name the pane

### Requirement: Redraw is driven by declared invalidation
A component SHALL declare what changed through revision kinds — content, selection, hover, layout, and
theme — and a host SHALL reuse a cached frame only while every declared revision is unchanged. A
component that declares no invalidation contract SHALL be treated as always stale rather than cached
incorrectly.

#### Scenario: Nothing changed
- **WHEN** a cached component is rendered again with every revision unchanged and the same rectangle
- **THEN** the cached frame SHALL be reused

#### Scenario: One revision changed
- **WHEN** any declared revision changes
- **THEN** the cached frame SHALL be discarded and the component SHALL render again

#### Scenario: Rectangle changed
- **WHEN** the rectangle differs from the cached one
- **THEN** the cached frame SHALL be discarded regardless of revisions

#### Scenario: Component declares no contract
- **WHEN** a component exposes no invalidation contract
- **THEN** it SHALL be rendered on every frame rather than cached

### Requirement: Text is measured by display width
A1 SHALL measure, truncate, and pad text by terminal display width rather than by code units,
accounting for wide characters, combining marks, and zero-width sequences, and SHALL NOT count
styling escape sequences as visible width. Truncation SHALL NOT split a character or leave a dangling
style.

#### Scenario: Measure wide and combining text
- **WHEN** text contains wide characters, combining marks, or zero-width joiners
- **THEN** its measured width SHALL equal the columns the terminal occupies

#### Scenario: Truncate styled text
- **WHEN** styled text is truncated to a width
- **THEN** the result SHALL occupy at most that width, SHALL NOT split a character, and SHALL NOT
  leave an unterminated style

### Requirement: One scrollbar serves every scrollable surface
A1 SHALL provide one scrollbar with declared geometry derived from content length, viewport height,
and scroll position. Each scrollable surface SHALL identify its own rail so two surfaces cannot share
hover or drag state. The scrollbar SHALL support pointer hover, thumb drag, and track paging, and
SHALL reserve no space when the content fits.

#### Scenario: Content fits the viewport
- **WHEN** content is no longer than the viewport
- **THEN** no scrollbar SHALL be drawn and no width SHALL be reserved for it

#### Scenario: Derive thumb geometry
- **WHEN** content is longer than the viewport
- **THEN** the thumb size and position SHALL follow the scroll position, and the thumb SHALL remain at
  least one row tall and stay within the track

#### Scenario: Drag the thumb
- **WHEN** the pointer presses the thumb and moves
- **THEN** the scroll position SHALL follow the pointer, and SHALL clamp at both ends without wrapping

#### Scenario: Two rails on screen
- **WHEN** two scrollable surfaces are visible and the pointer is over one rail
- **THEN** only that rail SHALL report hover, and dragging it SHALL NOT scroll the other

### Requirement: A grouped list block presents rows with sticky group headers
A1 SHALL provide a list pane over rows that are group headers, selectable elements, notes, or
spacers. While the top visible row belongs to a group, that group's header SHALL remain pinned as the
first rendered row so the reader always knows which group is on screen. Selection SHALL move only
between selectable rows, SHALL clamp at both ends without wrapping, and SHALL scroll the minimum
needed to bring the selection into view.

#### Scenario: Scroll into a group
- **WHEN** the top visible row is an element or note belonging to a group
- **THEN** that group's header SHALL be rendered pinned above the visible rows

#### Scenario: Move the selection
- **WHEN** the user moves the selection
- **THEN** it SHALL land on the next selectable row, skipping headers, notes, and spacers, and SHALL
  stay put at the first and last selectable row

#### Scenario: Selection leaves the viewport
- **WHEN** the selection moves outside the visible rows
- **THEN** the list SHALL scroll the least amount that brings it back into view

#### Scenario: List has no selectable row
- **WHEN** every row is a header, note, or spacer
- **THEN** the list SHALL render without a selection rather than selecting an unselectable row

### Requirement: A grouped list supports block navigation
A1 SHALL provide navigation between groups: a forward block jump lands on the first selectable
element of the next group, and a backward block jump lands on the first selectable element of the
current group, or of the previous group when the selection is already there. Groups with no
selectable element SHALL be skipped. There SHALL be no wrap-around. A block jump SHALL scroll so the
whole group is visible where it fits, and SHALL show it from its header where it does not. A1 SHALL
also provide jumps to the first and last selectable element.

#### Scenario: Jump forward a block
- **WHEN** a forward block jump is requested and a later group has a selectable element
- **THEN** the selection SHALL land on the first selectable element of the next such group

#### Scenario: Jump backward within a block
- **WHEN** a backward block jump is requested and the selection is below its group's first selectable
  element
- **THEN** the selection SHALL land on that first element rather than leaving the group

#### Scenario: Jump backward at the top of a block
- **WHEN** a backward block jump is requested and the selection is already the group's first element
- **THEN** the selection SHALL land on the first selectable element of the previous such group

#### Scenario: Jump at the edges
- **WHEN** a block jump is requested and no further group in that direction has a selectable element
- **THEN** the selection SHALL stay where it is rather than wrapping

#### Scenario: Reveal a jumped-to block
- **WHEN** a block jump lands on a group shorter than the viewport
- **THEN** the whole group SHALL be brought into view, not only the selected element

#### Scenario: Reveal an oversized block
- **WHEN** a block jump lands on a group taller than the viewport
- **THEN** the group SHALL be shown from its header

### Requirement: A single-line input serves filtering and inline editing
A1 SHALL provide a single-line input with a caret, horizontal scrolling when the text is wider than
its width, character insertion and deletion at the caret, and caret movement including to both ends.
It SHALL report accept and cancel distinctly so a caller can commit or discard, and cancelling SHALL
leave the caller's value unchanged.

#### Scenario: Type beyond the visible width
- **WHEN** the text is wider than the input
- **THEN** the view SHALL scroll to keep the caret visible while the full value is preserved

#### Scenario: Accept an edit
- **WHEN** the user accepts
- **THEN** the current value SHALL be reported as accepted

#### Scenario: Cancel an edit
- **WHEN** the user cancels
- **THEN** the edit SHALL be reported as cancelled and no value SHALL be committed

### Requirement: Pointer input is decoded and delivered in pane-local coordinates
A1 SHALL decode SGR mouse reports into press, release, motion, and wheel events with a
one-based column and row, SHALL separate them from keyboard input in the same chunk so
typing is never lost to a report, and SHALL deliver them to a pane in coordinates local
to that pane. A malformed or partial report SHALL be ignored rather than surfacing as
keystrokes.

#### Scenario: Decode a click
- **WHEN** a press report and its matching release arrive
- **THEN** a press event and a release event SHALL be reported with the button and the
  one-based position the terminal named

#### Scenario: Decode motion and wheel
- **WHEN** a motion report or a wheel report arrives
- **THEN** it SHALL be reported as motion, wheel-up, or wheel-down rather than as a press

#### Scenario: Keyboard input arrives in the same chunk
- **WHEN** a chunk contains both mouse reports and typed characters
- **THEN** the reports SHALL be extracted and the remaining characters SHALL still reach
  keyboard handling unchanged

#### Scenario: Malformed report
- **WHEN** a chunk contains an incomplete or malformed report
- **THEN** no event SHALL be reported for it and it SHALL NOT be delivered as keystrokes

#### Scenario: Translate into a pane
- **WHEN** an event inside a pane's rectangle is delivered to it
- **THEN** its column and row SHALL be relative to that pane's own top-left corner

### Requirement: Pointer reporting is enabled only while a screen needs it
A1 SHALL enable terminal mouse reporting only while a screen that uses pointer input is
presented, and SHALL disable it and restore the terminal when that screen closes, including
when it closes through a failure. Enabling and disabling SHALL be paired so a terminal is
never left reporting after A1 stops using it.

#### Scenario: Present and close a pointer-driven screen
- **WHEN** such a screen is presented and later closed
- **THEN** reporting SHALL be enabled on presentation and disabled on close, leaving the
  terminal as it was found

#### Scenario: Screen closes through a failure
- **WHEN** the screen closes because it failed
- **THEN** reporting SHALL still be disabled and the terminal restored

#### Scenario: No such screen is presented
- **WHEN** no screen using pointer input is presented
- **THEN** reporting SHALL remain disabled

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

### Requirement: An input accepts text, never a key it has no answer for
An input row SHALL insert only what the reader typed as text. A key the input does
not handle - a page key, a function key, a chord, an arrow the surrounding screen
owns - SHALL be swallowed rather than inserted, whichever escape form the terminal
sends it in. A surrounding screen MAY claim such a key for its own navigation, and
SHALL do so before the input sees it.

#### Scenario: Press a key the input does not handle
- **WHEN** a key arrives that the input has no behaviour for
- **THEN** the value SHALL be unchanged
- **AND** no part of the key sequence SHALL appear in the text

#### Scenario: The screen owns the key
- **WHEN** a screen navigates with a key while its input is open
- **THEN** the screen SHALL act on it and the input SHALL NOT receive it

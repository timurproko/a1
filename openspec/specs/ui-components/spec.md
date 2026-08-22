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

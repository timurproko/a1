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
A1 SHALL provide one scrollbar with declared geometry derived from content length, viewport height, scroll position, and track height. Each scrollable surface SHALL identify its own rail so two surfaces cannot share activity, hover, or drag state. The scrollbar SHALL support pointer hover, thumb drag, and track paging. `auto` and `always` SHALL reserve the final rail cell even while content fits so later visibility does not reflow content; `hidden` SHALL reserve no rail cell.

For overflowing content, the shared scrollbar SHALL accept an appearance of `auto`, `always`, or `hidden` and a style of `thin` or `thick`. `always` SHALL draw the rail whenever content overflows. `auto` SHALL draw it while its pointer zone is active, while its thumb is being dragged, and for a bounded linger after that rail scrolls; it SHALL keep the same rail column reserved while temporarily invisible. `hidden` SHALL draw no rail, reserve no rail column, and expose no interactive thumb or track. The track SHALL remain a connected dim `│` hairline. The selected style SHALL change the thumb from the accent `│` used by `thin` to the centered accent `┃` used by `thick`, without changing geometry or hit targets. A pointed-at or dragged thin thumb MAY temporarily use `┃` as its interaction emphasis. Track, thumb, hover, and drag emphasis SHALL use declared theme roles rather than literal terminal colors.

The shared scrollbar SHALL accept a speed of `normal`, `fast`, or `high`. Normal SHALL map one wheel event to three lines, fast to six lines, and high to nine lines. Appearance and style SHALL NOT change that selected wheel distance.

#### Scenario: Content fits the viewport
- **WHEN** content is no longer than the viewport
- **THEN** no scrollbar SHALL be drawn
- **AND** `auto` or `always` SHALL retain the final rail cell while `hidden` SHALL return it to content

#### Scenario: Derive thumb geometry
- **WHEN** content is longer than the viewport
- **THEN** the thumb size and position SHALL follow the scroll position, and the thumb SHALL remain at least one row tall and stay within the track

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

### Requirement: A grouped list block presents rows with sticky group headers
A1 SHALL provide a grouped-row component over group headers, selectable elements, read-only notes, and spacers. While the top visible row belongs to a group, that group's header SHALL remain pinned as the first rendered row so the reader always knows which group is on screen. Both selectable lists and read-only sectioned documents SHALL use the same group-header renderer and sticky layout rather than reimplementing title recognition, the yellow Markdown-heading role, one-cell left inset, spacing, or pinning. The layout SHALL allow an embedded document to suppress initial top padding while preserving the current padded default for Settings. Selection SHALL move only between selectable rows, SHALL clamp at both ends without wrapping, and SHALL scroll the minimum needed to bring the selection into view.

#### Scenario: Scroll into a group
- **WHEN** the top visible row is an element or note belonging to a group
- **THEN** that group's header SHALL be rendered pinned above the visible rows

#### Scenario: Move the selection
- **WHEN** the user moves the selection
- **THEN** it SHALL land on the next selectable row, skipping headers, notes, and spacers, and SHALL stay put at the first and last selectable row

#### Scenario: Selection leaves the viewport
- **WHEN** the selection moves outside the visible rows
- **THEN** the list SHALL scroll the least amount that brings it back into view

#### Scenario: List has no selectable row
- **WHEN** every row is a header, note, or spacer
- **THEN** the list SHALL render without a selection rather than selecting an unselectable row

#### Scenario: Present a read-only sectioned document
- **WHEN** a screen supplies ordered section titles and read-only content rows
- **THEN** each title SHALL use the shared yellow heading role and one-cell inset, its first content row SHALL follow directly, and the active title SHALL pin through the shared layout
- **AND** no title-specific rendering or scroll branch SHALL be required

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
It SHALL lay its value in effect over the anchor row, so that value stays where it was read, and SHALL shift only as far as needed to stay inside the body. It SHALL mark the value in effect independently of its active entry. A pointer-opened menu SHALL highlight the value in effect as soon as it opens, since that entry lies under the pointer that opened it. A keyboard-opened menu MAY request an initial active entry, which SHALL be highlighted as soon as the menu opens. A press outside the menu SHALL close it.

#### Scenario: Open over the anchor
- **WHEN** a menu is opened from a row
- **THEN** the entry for the value in effect SHALL occupy the anchor row, with earlier entries above it and later entries below it

#### Scenario: Open near the bottom of the screen
- **WHEN** a menu opened over its anchor would run past the bottom of the body
- **THEN** the menu SHALL be shifted up just far enough to fit inside the body, without crossing its top

#### Scenario: Open a menu
- **WHEN** a pointer press opens a menu from its anchor
- **THEN** the value in effect SHALL be marked and highlighted under the pointer

#### Scenario: Open a menu with an initial keyboard choice
- **WHEN** a keyboard action opens a menu and requests an initial active entry
- **THEN** that entry SHALL be highlighted immediately
- **AND** the value in effect SHALL remain marked independently

#### Scenario: Enter a pointer-opened menu
- **WHEN** a pointer press opens a menu from its anchor and subsequent pointer motion reaches another entry
- **THEN** the reached entry SHALL become highlighted

#### Scenario: Press outside the menu
- **WHEN** a press lands outside the open menu
- **THEN** the menu SHALL close and the press SHALL NOT act on what is behind it

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
The component layer SHALL provide one configurable interactive input component for search, inline editing, and the bare-A1 agent prompt. The component SHALL own its prompt presentation, text and block caret rendering, quiet placeholder, cursor movement, text insertion and deletion, selection, pointer gestures, copy/cut dispatch, and declared capability handling. A screen SHALL NOT independently recreate those interactions or compose equivalent input chrome from escapes of its own.

The component SHALL support explicit single-line or multiline configuration, optional presentation-only prompt markers and semantic marker roles, placeholders, accept and cancel callbacks, and paste capability. Bare A1's agent prompt and Settings search SHALL instantiate this same component while supplying different options: the agent retains multiline editing and its enabled history, autocomplete, submission, chip, and paste adapters; Settings remains a single-line filter with paste disabled. Standard dialog search inputs SHALL request the exact ASCII `> ` marker in the active accent role, while non-dialog auxiliary inputs MAY remain marker-free. The component SHALL keep one geometry and rendering implementation for rules, marker width, caret, selection, placeholder, clipping, content width, and pointer hit testing. Sharing only color constants or presentation while retaining independent editing controllers SHALL NOT satisfy this requirement.

The component layer SHALL also provide the status line a screen uses to say one thing at a time.

#### Scenario: Render an empty input row
- **WHEN** the shared input is shown with no text and a placeholder
- **THEN** the placeholder SHALL be shown quietly with the caret over its first cell
- **AND** the placeholder SHALL begin at the content start selected by that instance's prefix configuration

#### Scenario: Configure agent and Settings inputs
- **WHEN** the bare-A1 agent prompt and Settings search are created
- **THEN** both SHALL instantiate the same interactive input component
- **AND** the agent SHALL enable its multiline and paste capabilities while Settings SHALL select single-line behavior and disable paste

#### Scenario: Edit through shared interactions
- **WHEN** either input receives applicable character movement, word movement, deletion, selection extension, select-all, replacement typing, pointer drag, double-click, triple-click, copy, or cut input
- **THEN** the shared component SHALL apply the same editing and selection rules to its configured document
- **AND** caller-specific filtering or submission SHALL observe the resulting semantic text rather than reconstructing the edit

#### Scenario: Render agent and search input chrome
- **WHEN** the bare-A1 main agent prompt is rendered
- **THEN** the shared component SHALL supply one leading blank cell, the `❯` marker, and the established marker-to-content spacing
- **AND** those presentation cells SHALL NOT change semantic text offsets
- **WHEN** the full-screen Settings search input is rendered
- **THEN** the same component SHALL supply its rules and configured content inset without an agent or dialog prompt marker

#### Scenario: Render a standard dialog search input
- **WHEN** a bare-A1 standard dialog renders a typing-based search field
- **THEN** the shared presentation SHALL place exact ASCII `> ` before the caret or query
- **AND** the `>` SHALL use the active semantic accent role resolved during render
- **AND** marker width SHALL be included in caret, clipping, and pointer geometry

#### Scenario: Render an auxiliary input without a marker
- **WHEN** full-screen Settings search or another explicitly marker-free A1-owned auxiliary input is rendered
- **THEN** the shared component SHALL supply its rules and configured content inset without a chevron or greater-than marker
- **AND** the surface SHALL retain its configured interactive input behavior

#### Scenario: Disable paste for an input instance
- **WHEN** an input instance has paste disabled and receives a clipboard-paste binding, bracketed terminal paste frame, or paste callback
- **THEN** the component SHALL consume the paste interaction without inserting or replacing text
- **AND** ordinary typed text SHALL remain editable through the same component

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

### Requirement: Text selection ranges use display-column boundaries
The shared text-selection model SHALL represent accepted ordinary pointer drags as ordered, half-open display-column ranges that include the complete graphemes intersected by both the anchor cell and the current pointer cell. It SHALL distinguish an unextended press from a dragged one-cell range, normalize the same endpoint cells in either direction to the same source range, and keep grapheme clusters atomic. Once distinct drag motion has been accepted, returning to the anchor cell SHALL retain exactly the anchor grapheme rather than produce an empty range. Rendering and plain-text extraction SHALL consume the same normalized range so highlighted cells and copied text cannot disagree.

#### Scenario: Normalize a one-grapheme drag
- **WHEN** an accepted drag returns to its anchor cell after distinct motion
- **THEN** the normalized range SHALL span the boundaries immediately before and after the anchor grapheme
- **AND** rendering and extraction SHALL contain exactly that grapheme, including after release

#### Scenario: Normalize reverse endpoints
- **WHEN** two drag endpoint cells are supplied in reverse document order
- **THEN** normalization SHALL produce the same range as the corresponding forward endpoints, including both endpoint graphemes
- **AND** it SHALL preserve the moving endpoint for subsequent extension

#### Scenario: Keep an unextended press empty
- **WHEN** a press is released without an accepted distinct drag extension and without word or line selection
- **THEN** normalization SHALL produce no selected range
- **AND** repeated reports at the unchanged press cell SHALL NOT activate selection

#### Scenario: Resolve display-width text
- **WHEN** either endpoint intersects a wide character, emoji sequence, or combining sequence
- **THEN** it SHALL resolve to a complete grapheme boundary
- **AND** extraction SHALL preserve the original code-point sequence
- **AND** distinct pointer-cell motion within the same wide grapheme SHALL select that grapheme exactly once

#### Scenario: Extract a multiline range
- **WHEN** a normalized range crosses source rows
- **THEN** extraction SHALL include selected source text and semantic newlines only, including the source graphemes under both endpoint cells
- **AND** it SHALL omit ANSI styling, visual padding, and overlay cells

#### Scenario: Include adjacent endpoint graphemes
- **WHEN** a drag in `abcde` starts on `c` and moves to `b` or `d`
- **THEN** the selected source text SHALL be `bc` or `cd`, respectively
- **AND** neither endpoint grapheme SHALL be excluded

#### Scenario: Cross the anchor without deselection
- **WHEN** a drag anchored on `c` in `abcde` visits `b`, `c`, and `d` in sequence
- **THEN** the selected source text SHALL be `bc`, `c`, and `cd` in sequence
- **AND** the mirrored sequence through `d`, `c`, and `b` SHALL produce `cd`, `c`, and `bc`
- **AND** repeated reports at the anchor and release there SHALL retain `c` without an empty intermediate range

### Requirement: Selection composition declares and reuses row-level damage
A selectable viewport component SHALL retain a bounded reusable representation of stable visible rows and selected row variants. For a selection-only revision with unchanged content, rectangle, layout, and theme revisions, it SHALL identify each visible row whose normalized selected range changed and reuse every other row byte-for-byte. Reuse SHALL be bounded in memory and SHALL be invalidated by any revision that can change row content, display width, style, overlay order, or geometry.

#### Scenario: Extend within one row
- **WHEN** only the active selection boundary changes within one visible row
- **THEN** that row SHALL be the only selection-painted row recomputed
- **AND** every other visible row SHALL retain its cached rendered value

#### Scenario: Extend onto the next row
- **WHEN** a selection endpoint crosses into one adjacent visible row
- **THEN** the prior endpoint row and new endpoint row SHALL be recomputed as needed
- **AND** stable interior selected rows and unrelated rows SHALL be reused

#### Scenario: Reverse or shrink a selection
- **WHEN** the active boundary moves backward across previously selected rows
- **THEN** rows leaving or changing the selected range SHALL be restored from current unselected content
- **AND** no stale selection background SHALL remain

#### Scenario: Change a non-selection revision
- **WHEN** content, rectangle, layout, theme, source style, or overlay ordering changes
- **THEN** reuse SHALL be invalidated for every affected row
- **AND** the next frame SHALL reflect the new revision rather than cached bytes

#### Scenario: Bound retained variants
- **WHEN** pointer motion produces many distinct endpoint ranges over time
- **THEN** retained row and range variants SHALL stay within a declared bound related to the visible viewport
- **AND** evicting an old variant SHALL affect performance only, never selection correctness

### Requirement: Spinner-backed progress text has one canonical marker
The component layer SHALL provide one presentation rule for text rendered beside an animated progress spinner on an A1-owned surface. It SHALL render exactly one Unicode ellipsis (`…`) as the terminal progress marker, SHALL replace an existing terminal Unicode ellipsis or terminal run of ASCII periods rather than duplicating it, and SHALL apply the same rule regardless of which built-in or extension producer supplied the semantic message. Producers SHALL NOT need to add or choose progress punctuation.

The semantic label before the ellipsis SHALL use a restrained animation in which a compact neutral-white highlight moves across otherwise muted text. The highlight SHALL use the theme's ordinary text role independently of the spinner's accent role, SHALL advance more slowly than the spinner by deriving its phase from existing spinner updates, and SHALL include a pause between passes. The spinner SHALL retain its existing accent role. The ellipsis SHALL remain muted and stationary. Every phase SHALL have identical plain text, display width, and grapheme content; animation SHALL NOT add a timer, alter spinner cadence, move characters, cycle punctuation, or introduce a literal terminal colour.

#### Scenario: Present semantic progress text
- **WHEN** a spinner-backed A1 progress component receives `Working`
- **THEN** its visible plain-text message SHALL be `Working…`

#### Scenario: Normalize an existing marker
- **WHEN** the component receives `Compacting…`, `Retrying.`, or `Indexing......`
- **THEN** the visible plain-text message SHALL end in exactly `Compacting…`, `Retrying…`, or `Indexing…` respectively
- **AND** it SHALL contain neither a terminal run of ASCII periods nor a duplicated progress marker

#### Scenario: Re-render an already normalized message
- **WHEN** the component receives a message already ending in one Unicode ellipsis
- **THEN** the rendered plain text SHALL remain unchanged

#### Scenario: Animate a progress label
- **WHEN** successive spinner updates render a spinner-backed A1 progress label
- **THEN** a compact highlight using the theme's neutral white text role SHALL move across the semantic label at a slower cadence and pause between passes
- **AND** the spinner SHALL remain in its existing accent role while the non-highlighted label and ellipsis remain muted
- **AND** stripping terminal styling from every phase SHALL produce the same label and one Unicode ellipsis at the same display width

#### Scenario: Render an extension label with grapheme clusters
- **WHEN** an extension progress label contains a wide character, combining sequence, or emoji
- **THEN** each animation phase SHALL style only complete grapheme clusters
- **AND** the visible text and width SHALL remain unchanged

#### Scenario: Render text without a spinner
- **WHEN** a notice, diagnostic, result, ordinary status line, or pinned comparison status is rendered without the A1 progress presentation
- **THEN** the progress-marker and animated-highlight rules SHALL NOT alter its text or styling

### Requirement: Owned input bars and arrows have consistent themed presentation
Bare A1's agent prompt and shared ruled inputs, including Settings search, SHALL render their top and bottom bars with the active theme's semantic `border` role used by modal bars, without thinking-level or bash-mode tint. The agent input `❯` SHALL match the existing undimmed submitted-prompt arrow foreground and SHALL NOT be dimmed or faint. Standard dialog search inputs SHALL render the ASCII `>` in the active semantic `accent` role. Rule and prefix styles SHALL be owned by shared component or explicit dialog-adapter presentation policy rather than hardcoded at individual call sites. Quiet placeholder styling SHALL NOT leak into the agent arrow, dialog marker, or rules.

#### Scenario: Compare the two inputs with a submitted prompt
- **WHEN** a submitted prompt, the bare-A1 agent prompt, Settings search, a standard dialog search field, and a modal are viewed under the same theme and terminal color capability
- **THEN** the ruled inputs' bars SHALL match the modal rule's semantic `border` foreground
- **AND** the agent `❯` SHALL retain the submitted-prompt arrow's undimmed foreground
- **AND** the standard dialog `>` SHALL use the active accent foreground

#### Scenario: Change the active accent
- **WHEN** the active accent preference changes while an agent prompt or standard dialog search input is visible
- **THEN** shared input rules SHALL repaint with the new accent family's modal-border tone in the same session
- **AND** a standard dialog search marker SHALL repaint with the new semantic accent
- **AND** body text, placeholder treatment, caret, query, and geometry SHALL retain their established behavior

#### Scenario: Change the agent thinking level or input mode
- **WHEN** a level changes or the bare-A1 agent draft enters or leaves bash mode
- **THEN** the shared input rules SHALL remain on the semantic modal-border role rather than adopting a level or bash tint
- **AND** draft text, mode semantics, and caret position SHALL remain unchanged by restyling

#### Scenario: Resize and edit a multiline draft
- **WHEN** a user wraps a draft, resizes the terminal, moves the caret, selects text, or opens prompt suggestions
- **THEN** the shared prefix and rules SHALL preserve content width, continuation alignment, pointer hit geometry, and caret placement
- **AND** no rule or prefix SHALL become part of the submitted draft or copied text

### Requirement: Wheel axes remain distinct
A1 SHALL decode SGR vertical wheel reports as vertical wheel events and SHALL NOT reinterpret horizontal wheel reports as vertical movement. Unsupported horizontal wheel reports SHALL be removed from owned pointer input without becoming keyboard input.

#### Scenario: Decode vertical wheel input
- **WHEN** the terminal reports a vertical wheel-up or wheel-down action
- **THEN** A1 SHALL emit the matching vertical wheel event with the reported pointer position

#### Scenario: Receive horizontal wheel input
- **WHEN** the terminal reports a horizontal wheel-left or wheel-right action
- **THEN** A1 SHALL NOT emit a vertical wheel event
- **AND** the report SHALL NOT be delivered as typed or navigational keyboard input

#### Scenario: Receive mixed touchpad reports
- **WHEN** one input chunk contains vertical wheel reports, horizontal wheel reports, and keyboard text
- **THEN** A1 SHALL preserve the order and direction of the vertical wheel events
- **AND** SHALL preserve the keyboard text while safely discarding the horizontal wheel reports

### Requirement: Dialog shortcut rows distinguish keys from actions without separator glyphs

The component layer SHALL provide one semantic presentation reused by modal and full-screen dialog shortcut hints across presentation boundaries. Each hint entry SHALL render its shortcut label in the declared quiet key role using display capitalization (`Enter`, `Esc`, `Ctrl+S`) and its lowercase action name in a distinct declared text role. Adjacent entries SHALL be separated by whitespace only, with exactly two display cells between entries and no middle dot, bullet, or other separator glyph. The presentation SHALL retain entry boundaries while measuring, truncating, or wrapping so ANSI styling is not counted as visible width and no style sequence is split.

The semantic presentation SHALL NOT impose a content-row indent. An owning dialog SHALL place the shortcut row so its first visible cell uses the same display column as that dialog's heading or title, applying any established heading inset exactly once. List markers, form fields, editors, descriptions, and other content MAY retain a different inset. Punctuation that belongs to an action name or ordinary explanatory prose SHALL remain content and SHALL NOT be treated as an entry separator.

#### Scenario: Render multiple modal shortcuts
- **WHEN** a modal renders `↑↓ navigate`, `Enter select`, and `Escape cancel`
- **THEN** each shortcut label SHALL use the quiet key role and each action name SHALL use the distinct action-text role
- **AND** adjacent entries SHALL have exactly two spaces between them with no separator glyph

#### Scenario: Align a dialog shortcut row
- **WHEN** a dialog heading and its shortcut row are rendered with content rows that use a separate marker or field inset
- **THEN** the first visible shortcut cell SHALL begin in the same display column as the first visible heading cell
- **AND** the content-row inset SHALL remain independent of the shortcut-row placement

#### Scenario: Retain an established heading inset
- **WHEN** a dialog intentionally places its heading one or more cells inside its frame
- **THEN** its shortcut row SHALL use that same inset exactly once rather than moving to absolute column zero or adding a content indent

#### Scenario: Render at a narrow width
- **WHEN** a modal shortcut row does not fit its available width
- **THEN** the owning surface SHALL retain its declared clipping or wrapping behavior
- **AND** visible-width measurement SHALL preserve complete style sequences and the semantic key/action color boundary

#### Scenario: Include punctuation in an action name
- **WHEN** an action description contains punctuation as part of its wording
- **THEN** that punctuation SHALL remain visible
- **AND** it SHALL NOT create or be interpreted as a separator between hint entries

### Requirement: Modal frames place titles directly below their top rule

The component layer SHALL provide reusable modal-frame chrome whose title row immediately follows its top rule. A titled modal SHALL NOT render an empty row between that rule and the title, and an individual modal producer SHALL NOT recreate top-title spacing outside the shared frame boundary. The frame MAY retain separately declared spacing after the title and elsewhere in its body.

The same frame SHALL give every semantic content row a one-cell global left inset while rendering its top, bottom, and explicitly declared separator rules at full width. Titles, search/input components, selectable content, descriptions, status rows, and shortcut rows SHALL inherit that outer inset from the frame rather than independently encoding it. Existing row-authored spaces MAY express relative indentation inside the content area. Child components SHALL render against the reduced content width so clipping, wrapping, carets, and pointer geometry agree with the visible inset.

Removing the top-title gap SHALL remove exactly one rendered row while preserving title styling, relative body indentation, lower chrome, and vertical spacing. Unframed or extension-owned custom surfaces SHALL remain unchanged rather than receiving inferred semantic slots or having rendered rows rewritten heuristically.

#### Scenario: Render a titled modal frame

- **WHEN** a modal frame renders a top rule and a title
- **THEN** the title SHALL be the next rendered row after the rule
- **AND** there SHALL be no empty row between them

#### Scenario: Inset modal content

- **WHEN** a modal frame renders its title, input, list rows, descriptions, status, and shortcuts
- **THEN** each semantic content row SHALL begin within the frame's one-cell global left inset
- **AND** relative indentation authored inside those rows SHALL remain relative to that inset

#### Scenario: Keep rules full width

- **WHEN** a padded modal frame renders a top, bottom, or declared separator rule
- **THEN** that rule SHALL continue to occupy the frame width
- **AND** the content inset SHALL NOT shorten or shift it

#### Scenario: Preserve spacing below the title

- **WHEN** a modal declares separation between its title and body
- **THEN** that separation SHALL remain below the title
- **AND** removing the top-title gap and applying the global inset SHALL NOT compact body sections or shortcut chrome

#### Scenario: Render an untitled custom surface

- **WHEN** a modal-like surface has no A1-authored title or owns its own extension-provided geometry
- **THEN** the shared frame policy SHALL NOT infer a title or remove a row by inspecting rendered text

#### Scenario: Resize a compact modal

- **WHEN** a titled modal is rendered at a narrow width or after a terminal resize
- **THEN** top-rule/title adjacency and the one-cell global content inset SHALL remain in effect
- **AND** child content SHALL receive the reduced width so title styling, clipping, wrapping, caret placement, and pointer geometry remain coherent

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

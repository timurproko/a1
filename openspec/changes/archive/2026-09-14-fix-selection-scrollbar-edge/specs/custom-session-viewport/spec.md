## ADDED Requirements

### Requirement: Right-edge selection remains truthful across scrollbar presentation
Bare A1 SHALL allow a transcript selection begun outside viewport controls to extend through the final rendered source grapheme, including source text occupying the scrollbar overlay column. Whole-row selections and completed interior rows of a multiline selection SHALL include their final source graphemes in highlighting and copied text. A partial endpoint that excludes the final source grapheme SHALL leave that grapheme unselected.

With document content, geometry, viewport position, and selection endpoints unchanged, scrollbar hover, reveal, style changes, and hide SHALL NOT change selection membership or copied text. The scrollbar overlay cell SHALL retain the selected background exactly when that cell is covered by the normalized visual selection range, including the existing whole-row and trailing-whitespace padding rules; otherwise it SHALL retain the underlying unselected background. The scrollbar glyph SHALL remain visible above that background and SHALL NOT enter copied text. Hiding the overlay SHALL restore the underlying source grapheme with its correct selection state.

#### Scenario: Complete several lines through the right edge
- **WHEN** a transcript drag selects complete lines including rows with source text in the final terminal column and ends through the last source grapheme of its endpoint row
- **THEN** every included final grapheme SHALL be selected and copied without needing a scrollbar hover
- **AND** equivalent forward and reverse ranges SHALL highlight and copy the same source text
- **AND** neither a reserved control width nor overlay visibility SHALL truncate the selected source range

#### Scenario: Hover with the last character selected
- **WHEN** a released selection includes the final source grapheme and the pointer enters and leaves the scrollbar without pressing or scrolling
- **THEN** the selected background SHALL remain under the rail while it is visible
- **AND** the last source grapheme SHALL reappear selected when the rail hides
- **AND** selection endpoints and copied text SHALL remain unchanged throughout

#### Scenario: Hover with the last character deliberately excluded
- **WHEN** a released partial selection ends immediately before the final source grapheme and the pointer enters and leaves the scrollbar without pressing or scrolling
- **THEN** the final cell SHALL NOT gain selection background from its selected neighbor
- **AND** the last source grapheme SHALL reappear unselected when the rail hides
- **AND** copied text SHALL exclude that grapheme before, during, and after hover

#### Scenario: Change rail presentation without changing the selection
- **WHEN** the rail reveals from activity, changes between normal and hovered presentation, or hides after activity expires while the source range remains fixed
- **THEN** the first frame of each transition SHALL paint the final cell according to the same selection range, without stale or transient false highlighting
- **AND** this behavior SHALL hold for thin and thick rails in auto and always modes, and selection in hidden mode SHALL reach the same source text

#### Scenario: Preserve styled and wide right-edge content
- **WHEN** selected or unselected right-edge content contains a wide grapheme, a combining sequence, source background styling, or a hyperlink
- **THEN** selection and copy SHALL preserve whole source graphemes and existing source-selection styling rules
- **AND** the rail SHALL use the correct underlying cell background without inheriting source hyperlink or emphasis decoration
- **AND** no overlay glyph, visual padding, or partial grapheme SHALL be added to copied text

#### Scenario: Continue selection into the rail without stealing a new rail gesture
- **WHEN** a selection drag begun on ordinary transcript content reaches the final terminal column
- **THEN** the active selection SHALL extend through the source grapheme at that column rather than starting scrollbar navigation
- **AND** a separate press beginning on the existing scrollbar hit region SHALL retain its established scrollbar ownership

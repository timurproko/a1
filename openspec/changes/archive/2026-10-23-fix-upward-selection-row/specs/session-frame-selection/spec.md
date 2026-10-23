## MODIFIED Requirements

### Requirement: Frame selection remains boundary-precise

An accepted ordinary frame drag SHALL use ordered display-column boundaries that include the complete graphemes intersected by its anchor and moving pointer cells. Forward and reverse drags over the same cells SHALL paint and copy the same range. Wide characters and combining sequences SHALL remain atomic. A press and release with no accepted distinct movement SHALL remain a click and SHALL NOT create or copy a synthetic selection.

An upward drag within transcript content SHALL map its moving endpoint to the content row under the pointer without a one-row downward offset. The top endpoint row SHALL begin at the pointed grapheme and continue toward the lower anchor using standard reverse-selection semantics; it SHALL NOT select an additional row beyond the pointer or convert the endpoint row into a full-width interior row. Prompt/editor rows outside the addressed transcript content SHALL remain excluded.

When held-edge auto-scroll grows a transcript drag beyond one screen, copy SHALL include every selected transcript row from the pointed endpoint to the press anchor, including rows scrolled past either viewport edge and transcript text beneath the floating jump-to-bottom control. Paint SHALL remain clipped to visible rows, and a selection with no visible row SHALL copy nothing. A transcript-originated drag held below the viewport while the transcript is detached from its end SHALL keep its moving endpoint on the last visible content row at the pointer column while auto-scroll advances; only after the transcript end is shown SHALL the endpoint continue into dock rows. While the gesture is held, streaming output that restyles or reflows a selected row SHALL NOT move the press anchor toward the newest output or clear the selection; an endpoint whose row text changed SHALL keep its document row.

Double-click SHALL select the visible word at the pointed cell and triple-click SHALL select the useful visible content of that frame row. Once a distinct drag is active, returning to the anchor cell SHALL retain the anchor grapheme, and motion across row or region boundaries SHALL not create an empty intermediate range.

#### Scenario: Drag one grapheme in dock content
- **WHEN** a drag in a footer/status or prompt row moves into one adjacent grapheme and returns to its anchor cell
- **THEN** the resulting range SHALL retain exactly the anchor grapheme
- **AND** the same cells SHALL be selected in either direction

#### Scenario: Cross a wide or combining grapheme
- **WHEN** a frame-selection endpoint intersects a wide character or combining sequence in any row kind
- **THEN** painting and copying SHALL include the complete grapheme
- **AND** neither terminal cells nor source code points SHALL be split

#### Scenario: Click without dragging
- **WHEN** the primary button is pressed and released on one base-frame cell without accepted distinct movement
- **THEN** no frame selection SHALL remain
- **AND** the surface's ordinary click behavior SHALL remain eligible

#### Scenario: Select a visible word or line
- **WHEN** the reader double-clicks a visible word or triple-clicks a visible row outside an interaction owned by a modal or explicit control
- **THEN** the complete visible word or useful row text SHALL be selected
- **AND** the resulting selection SHALL use the same copy path as an ordinary drag

#### Scenario: Stop an upward drag on the first content row
- **WHEN** a reverse drag stops on a transcript content row adjacent to prompt-owned chrome
- **THEN** selection SHALL include that pointed content row from the pointer grapheme toward the lower anchor
- **AND** it SHALL NOT omit that row, select a row above the pointer, or paint the adjacent prompt row

#### Scenario: Auto-scroll an upward drag past one screen
- **WHEN** a reverse transcript drag holds the pointer at the top edge until the press anchor scrolls below the viewport
- **THEN** copy SHALL contain the pointed row from the pointer grapheme through every row down to the press anchor
- **AND** no selected row SHALL be dropped or replaced by jump-to-bottom chrome

#### Scenario: Auto-scroll a downward drag to the transcript end
- **WHEN** a transcript drag in a detached viewport holds the pointer on dock rows below the viewport
- **THEN** the moving endpoint SHALL stay on the last visible content row while auto-scroll reveals each following row
- **AND** it SHALL enter dock rows only after the transcript end is visible

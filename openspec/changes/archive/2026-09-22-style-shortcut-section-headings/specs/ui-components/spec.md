## MODIFIED Requirements

### Requirement: A grouped list block presents rows with sticky group headers
A1 SHALL provide a grouped-row component over group headers, selectable elements, read-only notes, and spacers. While the top visible row belongs to a group, that group's header SHALL remain pinned as the first rendered row so the reader always knows which group is on screen. Both selectable lists and read-only sectioned documents SHALL use the same group-header renderer and sticky layout rather than reimplementing title recognition, accent styling, spacing, or pinning. The layout SHALL allow an embedded document to suppress initial top padding while preserving the current padded default for Settings. Selection SHALL move only between selectable rows, SHALL clamp at both ends without wrapping, and SHALL scroll the minimum needed to bring the selection into view.

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
- **THEN** each title SHALL use the shared group-header renderer, its first content row SHALL follow directly, and the active title SHALL pin through the shared layout
- **AND** no title-specific rendering or scroll branch SHALL be required

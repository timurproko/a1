## ADDED Requirements

### Requirement: The settings screen uses the framed A1 visual hierarchy
The owned settings screen SHALL render a fixed full-width rule in the active theme's border role at the top of the screen, followed by a one-column-inset `Settings` title in bold accent role. A second full-width border-role rule SHALL separate the settings content from the active footer. In the dark theme shown by the product these roles SHALL remain the established blue border and cyan accent colors. Settings section headers, including a sticky header, SHALL render bold in the theme's heading role, which SHALL match the yellow Markdown-heading color used by `What's New`. Setting labels, selected rows, values, notes, menus, dialogs, search, notices, and footer guidance SHALL retain their established semantic roles.

The frame and title SHALL remain fixed while the settings list scrolls. The list, sticky-header calculation, scrollbar, pointer hit regions, value menus, structured dialog, search input, and footer SHALL use the content rectangle left after fixed chrome is allocated. Every terminal size SHALL still produce exactly the requested row count with no row wider than the requested width.

#### Scenario: Open the framed settings screen
- **WHEN** the user opens `/settings` with the ordinary dark theme
- **THEN** the screen SHALL show a full-width blue top rule, a bold cyan `Settings` title inset by one column, and a full-width blue rule above the footer
- **AND** `Generic`, `Scroll`, `History`, `Agent`, and every other settings section heading SHALL be bold yellow
- **AND** setting rows and values SHALL retain their existing selected, unselected, and hover colors

#### Scenario: Scroll the framed settings list
- **WHEN** the settings entries overflow and the user scrolls or jumps between sections
- **THEN** the two border rules and `Settings` title SHALL remain fixed
- **AND** the visible sticky section heading SHALL remain bold in the yellow heading role inside the reduced content rectangle
- **AND** the scrollbar thumb and pointer targets SHALL correspond to the rows visibly drawn between the fixed header and footer rule

#### Scenario: Use search, menus, or a structured dialog
- **WHEN** the user opens settings search, a scalar value menu, or a structured-setting dialog
- **THEN** the screen frame and title SHALL retain their border and accent roles
- **AND** the active shared input, menu, dialog, notices, and guidance SHALL retain their established composition, colors, keyboard behavior, and pointer behavior without being displaced outside the screen

#### Scenario: Render a constrained settings frame
- **WHEN** the settings screen is rendered at a narrow width or a height smaller than its ordinary chrome and content
- **THEN** the frame SHALL prioritize rows from the top in stable order, clip ANSI-aware, and fill exactly the requested rectangle
- **AND** it SHALL NOT emit an over-width row, an embedded line break, or a pointer target for a row that is not visible
